const callPythonScript = require("../helper/callConvertScript");
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const moment = require('moment');
const outputPath = './files/excel'
const chapters = require('../utils/chapter.json')
const sections = require('../utils/section.json');
const socs = require('../utils/soc.json')
const { default: axios } = require("axios");
const db = require('../models');
const { formatScoreMap, getFormattedUserScoreMap } = require("../utils/formatScoreMap");
const Vessels = db.vessels
const VesselInspections = db.vesselInspections
const InspectionQuestions = db.inspectionQuestions
const InspectionScore = db.inspectionScore
const Op = db.Sequelize.Op

const negativeObsertions = {
    "Hardware": ["Observable or detectable deficiency"],
    "Process": ["Not as expected – procedure and/or document deficient."],
    "Human": ["Not as expected"],
    "Photograph": ["Photo not representative."]
}

const positiveObsertions = {
    "Human": ["Exceeded normal expectation"]
}

const nocGrouped = {
    "Hardware": [
      "Maintenance task available – not completed",
      "Maintenance task available – records incompatible with condition seen",
      "No maintenance task developed",
      "Maintenance deferred – awaiting spares",
      "Maintenance deferred – awaiting technician",
      "Maintenance deferred – awaiting out of service / gas free",
      "Sudden failure – maintenance tasks available and up to date",
      "Other - Text",
      "Not applicable – as instructed by question guidance",
      "Other – provide reason",
      "Equipment not fitted – erroneous entry in HVPQ"
    ],
    "Process": [
      "No procedure",
      "Procedure not present/available/accessible",
      "Too many/conflicting procedures",
      "Procedure clarity and understandability",
      "Procedure accuracy/correctness",
      "Procedure realism/feasibility/suitability",
      "Procedure completeness/validity/version",
      "Communication of procedure/practice updates",
      "Other – text",
      "Not applicable – as instructed by question guidance",
      "Communication of procedure/practice updates"
    ],
    "Human": [
      "1. Recognition of Safety criticality of the task or associated steps",
      "2. Custom and practice surrounding use of procedures",
      "3. Procedures accessible, helpful, understood and accurate for task",
      "4. Team dynamics, communications and coordination with others",
      "5. Evidence of stress, workload, fatigue, time constraints",
      "6. Factors such as morale, motivation, nervousness",
      "7. Workplace ergonomics incl. signage, tools, layout, space, noise, light, heat, etc",
      "8. Human-Machine Interface (E.g.: Controls, Alarms, etc.)",
      "9. Opportunity to learn or practice",
      "10. Not Identified",
      "Not applicable – as instructed by question guidance"
    ],
    "Photograph": [
      "Area/item shown recently upgraded – maintenance programme in progress",
      "Area/item shown recently upgraded – no evidence of ongoing maintenance plan",
      "Area/item shown not representative of the overall condition",
      "Other - Text",
    ]
};

const applyScores = async (questions, user_id) => {
  try{
    const scoreMap = await getFormattedUserScoreMap(user_id)
    return questions.map((q) => {
      const updated = { ...q };

      ['hardwareNegatives', 'processNegatives', 'humanNegatives', 'photoNegatives'].forEach((category) => {
        if (!Array.isArray(updated[category])) return;
        
        updated[category] = updated[category].map((neg) => {
          const noc = neg.noc?.trim();
          const soc = neg.soc?.toLowerCase();
          let score = null;

          if (category === 'hardwareNegatives') {
            if(q.tag === "Core"){          
                score = scoreMap.Hardware[noc]?.coreVIQ;
              }else if(q.tag === "Rotational 1" || q.tag === "Rotational 2"){
                score = scoreMap.Hardware[noc]?.rotationalVIQ;
              }        
          }

          if (category === 'processNegatives') {
            if(q.tag === "Core"){
              score = scoreMap.Process[noc]?.coreVIQ;
            }else if(q.tag === "Rotational 1" || q.tag === "Rotational 2"){
              score = scoreMap.Process[noc]?.rotationalVIQ;
            }
          }

          if (category === 'humanNegatives') {
            const role = soc?.includes('junior') || soc?.includes('rating') ? 'Junior' : 'Senior';
            if(q.tag === "Core"){          
              score = scoreMap.Human[role][noc]?.coreVIQ;
            }else if(q.tag === "Rotational 1" || q.tag === "Rotational 2"){          
              score = scoreMap.Human[role][noc]?.rotationalVIQ;
            }
          }

          if (category === 'photoNegatives') {
            score = scoreMap.Photograph[noc]?.coreVIQ;
          }

          return {
            ...neg,
            score: score !== undefined ? score : null
          };
        });
      });

      return updated;
    });
  }
  catch(err){
    console.log(err)
  }
};

const getQuestionData = async () => {
  try {
    const response = await axios.get('https://api-sire.solminds.com/data/questions.json');
    return response.data;
  } catch (error) {
    console.error('Error fetching question data:', error);
    return null;
  }
} 

function getInspectionCompletedDate(page2Text) {
  const lines = page2Text.split('\n');
  const targetLabel = 'Date the inspection was completed';

  const index = lines.findIndex(line => line.trim().toLowerCase() === targetLabel.toLowerCase());
  if (index !== -1 && lines[index + 1]) {
    const rawDate = lines[index + 1].trim(); // e.g., "27 Sep 2024"
    const parsedDate = new Date(rawDate);

    // Check for invalid date
    if (!isNaN(parsedDate)) {
      const yyyy = parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;  // YYYY-MM-DD
    }
  }

  return null;
}

const convertToExcel = async (req, res)=>{
    try{

        const { filename } = req.body

        const allQuestionData = await getQuestionData();

        const file = await callPythonScript(filename);

        const outputFileName = file.jsonFilePath
        
        const data = JSON.parse(fs.readFileSync(outputFileName, 'utf-8'));
        // const data = JSON.parse(fs.readFileSync("./files/output_20250602_211244.json", 'utf-8'));
        
        const reportDate = getInspectionCompletedDate(file.page2Text);

        const filteredData = data.filter(item => {
            return !sections.some(section => item.content.includes(section));
        });

        let index = 0
        let array = []

        function getVesselName(reportString) {
            const prefix = "Report for ";
            const suffixStart = reportString.indexOf(" [");
            
            if (reportString.startsWith(prefix) && suffixStart !== -1) {
                return reportString.substring(prefix.length, suffixStart);
            }
            return null;
        }

        const vesselName = getVesselName(data[0].content) || "ocimf"

        function getVesselsOperationData(page2Text) {
        const lines = page2Text.split('\n');
        const targetLabel = "Vessel's operation at the time of the inspection";
        const index = lines.findIndex(line => line.trim().toLowerCase() === targetLabel.toLowerCase());

        if (index !== -1 && lines[index + 1]) {
          return lines[index + 1].trim();
        }
        return null;
      }
      const vesselsOperationData = getVesselsOperationData(file.page2Text);
      // console.log("Vessel's Operation:", vesselsOperationData);

        filteredData.forEach(i => {
            if(
                i.content !== "" &&
                i.content !== " " &&
                i.content !== data[0].content &&
                !i.content.includes("© 2024 Oil Companies International Marine Forum") &&
                !i.content.includes("© 2025 Oil Companies International Marine Forum")
            ){
                array.push({data: i.content, index: index ++ })
            }
        });

        const response = await chapterWiseSort(array, allQuestionData) 

        const user = req.user

        const newScoredData = await applyScores(response, user.id);

        const filePath = path.join(__dirname, '../../', outputFileName);

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });

        const insertData = await createVesselWithInspectionAndScores(newScoredData, user, req.body, reportDate, filename, vesselsOperationData  )

        if(insertData.success){
          res.status(200).json({message: insertData.message, success: true, data: newScoredData, vesselName});
        }else{
          res.status(500).json({message: insertData.message, success: false});
        }

    }
    catch(err){
        console.log(err)
    }
}

async function createVesselWithInspectionAndScores(newScoredData, user, data, reportDate, fileName, vesselsOperationData) {

  const { vessel_id } = data

  const inspection = await VesselInspections.findOne({
    where: {
      [Op.and]: [{ vessel_id: vessel_id }, {report_date: reportDate}, {status: {[Op.ne]: "deleted"}}],
    }
  })

  if(inspection) {
    return {
      success: false,
      message: "Report already exists for this date"
    }
  }

  await VesselInspections.update(
    {status: "inactive"}, 
    {where: {
      [Op.and]: [{vessel_id}, {status: {[Op.ne]: "deleted"}}]
    }
  })

  const vessel = await Vessels.findOne({
    where: {
      [Op.and]: [
        { id: vessel_id },
        { status: { [Op.ne]: 'deleted' } }
      ]
    }
  });

  if(!vessel) {
    return {
      success: false,
      message: "Vessel not found"
    }
  }

  const vesselInspection = await VesselInspections.create({
    user_id: user.id,
    vessel_id: vessel_id,
    fleet_id: vessel.fleet_id,
    super_id: vessel.super_id,
    report_date: reportDate,
    report_name: fileName,
    vesselsOperation: vesselsOperationData
  });
  // console.log("vesselsOperationData", vesselsOperationData)

  for (const item of newScoredData) {
    const question = await InspectionQuestions.create({
      inspection_id: vesselInspection.id,
      viq: item.question_no,
      question: item.question,
      tag: item.tag,
      chapter_no : item.chapter_no,
     });

    if (!question) continue;

    const scoresToInsert = [];

    const fetchScoreData = (negatives, category, isPositive) => {
      if (!Array.isArray(negatives)) return;
      for (const neg of negatives) {
        scoresToInsert.push({
          question_id: question.id,
          negative: neg.negative,
          noc: neg.noc,
          soc: neg.soc,
          remark: neg.remark,
          score: neg.score,
          category,
          isNegative: isPositive ? "no" : "yes",
          operator_comments: item.operatorComments?.operatorComments || null,
          // pif: item.operatorComments?.pifData || null
          pif: item.operatorComments?.pifData?.length ? item.operatorComments.pifData : null,
          tmsa: item.tmsaData || null
        });
      }
    };

    fetchScoreData(item.hardwareNegatives, "hardware");
    fetchScoreData(item.processNegatives, "process");
    fetchScoreData(item.humanNegatives, "human");
    fetchScoreData(item.photoNegatives, "photo");
    fetchScoreData(item.humanPositives, "human", true);

    if (scoresToInsert.length > 0) {
      await InspectionScore.bulkCreate(scoresToInsert);
    }
      
  }

  return {
    success: true,
    message: "Success"
  }

}


const chapterWiseSort = async(data, allQuestionData)=>{

    const formatChapter = chapters.map(item => {
        return item.chapter_no + ". " + item.name
    })

    const matchedData = data.filter(item => 
        formatChapter.some(chapter => item.data.includes(chapter))
    );

    const uniqueData = matchedData.filter((item, index) => {
        return matchedData.findIndex((i) => i.data === item.data) === index;
    });


    let array = []
    for(let i = 0; i < uniqueData.length; i++) {
        array.push({
            data: uniqueData[i].data,
            startIndex: uniqueData[i].index,
            endIndex: uniqueData[i+1] ? uniqueData[i+1].index - 1 : data.length
        }) 
    }

    const response = await chapterWiseFilter(data, array, allQuestionData)
      
    return response
}

const chapterWiseFilter = async(data, array, allQuestionData) => {
    let datas = []

    for(let i = 0; i < array.length; i++) {
    // for(let i = 0; i < 1; i++) {

        const chapter = array[i]
        const chapter_no = chapter.data.split(".")[0]

        const filteredData = data.filter((item, index) => {
            return item.index >= chapter.startIndex && item.index <= chapter.endIndex
        })

        const matchedData = filteredData.filter(item => /^\d+\.\d+\.\d+\.\s/.test(item.data))
        
        const uniqueData = matchedData.filter((item, index) => {
            return matchedData.findIndex((i) => i.data === item.data) === index;
        });
        
        let qst = []
        
        for(let i = 0; i < uniqueData.length; i++) {
        // for(let i = 0; i < 4; i++) {
            const startIndex = uniqueData[i].index
            const endIndex = uniqueData[i+1] ? uniqueData[i+1].index - 1 : data.length
            const filterQuestion = filteredData.filter(item => item.index >= startIndex && item.index <= endIndex)

            const piq = filterQuestion.find(item => item.data.includes("PIQ additional data"));
            const hw = filterQuestion.find(item => item.data.includes("Hardware"))
            const pr = filterQuestion.find(item => item.data.includes("Process"))
            const hu = filterQuestion.find(item => item.data.includes("Human"))
            const py = filterQuestion.find(item => item.data.includes("Operator uploaded photos"))
            const questionSlice = piq ? piq.index -  startIndex : py ? py.index - startIndex : hw ? hw.index -  startIndex : pr ? pr.index -  startIndex : hu ? hu.index -  startIndex : filterQuestion.length

            const question = filterQuestion.slice(0, questionSlice)

            const matchQuestionFormat = question.filter(item => /^\d+\.\d+\.\d+\.\s/.test(item.data))
            
            const matchedIndex = matchQuestionFormat.length > 0 ? matchQuestionFormat[0].index : -1;
            
            const questionsAfterMatched = matchedIndex !== -1 ? question.slice(question.findIndex(item => item.index === matchedIndex)) : [];
            
            const numbers = questionsAfterMatched.map(item => item.data.match(/^\d+(\.\d+)+\./)?.[0] || "").filter(Boolean);
            const viq = questionsAfterMatched.map(item => item.data.match(/^\d+(\.\d+)+/)?.[0] || "").filter(Boolean);            
            const questions = questionsAfterMatched.map(item => item.data.replace(/^\d+(\.\d+)+\./, '').trim());
            
            const concatenatedNumbers = numbers.join(' ');
            const concatenatedViq = viq.join(' ');
            const concatenatedQuestions = questions.join(' ');
            const currentQuestion = allQuestionData.find(e=> e.question_no === concatenatedViq);

            const hardwareNegatives = extractStandardCategoryNegatives(filterQuestion, 'Hardware', nocGrouped, negativeObsertions);
            const processNegatives = extractStandardCategoryNegatives(filterQuestion, 'Process', nocGrouped, negativeObsertions);
            const humanNegatives = extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions);
            const humanPositives = extractValidHumanNegatives(filterQuestion, nocGrouped, positiveObsertions);
            const photoNegatives = extractPhotoNocObservations(filterQuestion, nocGrouped);
            const operatorComments = extractOperatorComments(filterQuestion);
            const tmsaData = extractTMSA(filterQuestion)
            // console.log("operatorComments",operatorComments)
            let newData = {
                chapter_no,
                question_no: concatenatedNumbers,
                tag: currentQuestion ? currentQuestion.tag : '',
                question: concatenatedQuestions,
                hardwareNegatives,
                processNegatives,
                humanNegatives,
                humanPositives,
                photoNegatives,
                operatorComments,
                tmsaData
            }
                        
            if(hardwareNegatives.length > 0 || processNegatives.length > 0 || humanNegatives.length > 0 || humanPositives.length > 0 || photoNegatives.length > 0) {
                qst.push(newData)
            }

        }

        datas.push(...qst)
    }

    return datas

}

// function extractStandardCategoryNegatives(filterQuestion, category, nocGrouped, negativeObsertions) {
//   const result = [];
//   const baseNegatives = negativeObsertions[category] || [];
//   const validNocs = nocGrouped[category] || [];
//   const socSet = new Set((typeof socs !== 'undefined' ? socs : []).map(s => s.description.toLowerCase().trim()));

//   let inSection = false;
//   let sectionLines = [];

//   for (let i = 0; i <= filterQuestion.length; i++) {
//     const line = i < filterQuestion.length ? filterQuestion[i].data.trim() : '';
//     const lower = line.toLowerCase();

//     const isSectionStart = lower.startsWith("hardware") || lower.startsWith("process") || lower.startsWith("human") || lower.startsWith("photograph")

//     if (isSectionStart || i === filterQuestion.length) {
//       if (inSection) {
//         const sectionText = sectionLines.join(' ').replace(/\s+/g, ' ').trim();
//         let lowerText = sectionText.toLowerCase();
//         let remarkFind = sectionText

//         baseNegatives.forEach((neg) => {
//           if (!lowerText.includes(neg.toLowerCase())) return;

//           validNocs.forEach(noc => {
//             const pattern = new RegExp(`((?:[a-z0-9\\s&\\-\\/]+):\\s*)?${noc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'i');
//             let match;
//             while ((match = pattern.exec(lowerText)) !== null) {
//               const soc = match[1] ? match[1].trim().replace(/:$/, '') : null;
//               const nocIndex = match.index + match[0].length;
//               let afterNoc = lowerText.slice(nocIndex);
//               // let afterNoc = remarkFind.slice(nocIndex);
//               const opIndex = afterNoc.indexOf("operator comments");
//               const remark = (opIndex !== -1 ? afterNoc.slice(0, opIndex) : afterNoc).trim();

//               let matchedSoc = null;
//               if (soc && socSet.has(soc.toLowerCase())) {
//                   const original = (socs || []).find(s => s.description.toLowerCase() === soc.toLowerCase());
//                   matchedSoc = original ? original.description : soc;
//                 // matchedSoc = soc;
//               } else {
//                 // const fallback = Array.from(socSet).filter(s => lowerText.includes(s));
//                 const fallback = (typeof socs !== 'undefined' ? socs : [])
//                                 .filter(s => lowerText.includes(s.description.toLowerCase()))
//                                 .sort((a, b) => b.description.length - a.description.length)
//                                 // .reverse();

//                 if (fallback.length > 0) {
//                   // fallback.sort((a, b) => b.length - a.length);
//                   // matchedSoc = fallback[0];
//                   matchedSoc = fallback[0].description;

//                 }
//               }

//               result.push({
//                 negative: neg,
//                 soc: matchedSoc,
//                 noc,
//                 remark
//               });

//               lowerText = lowerText.slice(nocIndex); // move to next possible NOC
//             }
//           });
//         });
//       }

//       inSection = lower.startsWith(category.toLowerCase());
//       sectionLines = inSection ? [line] : [];
//     } else if (inSection) {
//       sectionLines.push(line);
//     }
//   }

//   return result;
// }

function extractStandardCategoryNegatives(filterQuestion, category, nocGrouped, negativeObsertions) {
  const result = [];
  const baseNegatives = negativeObsertions[category] || [];
  const validNocs = nocGrouped[category] || [];
  const socSet = new Set((typeof socs !== 'undefined' ? socs : []).map(s => s.description.toLowerCase().trim()));

  let inSection = false;
  let sectionLines = [];

  for (let i = 0; i <= filterQuestion.length; i++) {
    const line = i < filterQuestion.length ? filterQuestion[i].data.trim() : '';
    const lower = line.toLowerCase();

    const isSectionStart = lower.startsWith("hardware") || lower.startsWith("process") || lower.startsWith("human") || lower.startsWith("photograph");

    if (isSectionStart || i === filterQuestion.length) {
      if (inSection) {
        const sectionText = sectionLines.join(' ').replace(/\s+/g, ' ').trim();
        let lowerText = sectionText.toLowerCase();
        let remarkOriginal = sectionText;

        baseNegatives.forEach((neg) => {
          if (!lowerText.includes(neg.toLowerCase())) return;

          validNocs.forEach(noc => {
            const pattern = new RegExp(`((?:[a-z0-9\\s&\\-\\/]+):\\s*)?${noc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'i');
            let match;
            while ((match = pattern.exec(lowerText)) !== null) {
              const soc = match[1] ? match[1].trim().replace(/:$/, '') : null;
              const nocIndex = match.index + match[0].length;

              // Use original casing for remark
              let afterNoc = remarkOriginal.slice(nocIndex);
              const opIndex = afterNoc.toLowerCase().indexOf("operator comments");
              const rawRemark = (opIndex !== -1 ? afterNoc.slice(0, opIndex) : afterNoc).trim();

              const remark = rawRemark
                ? rawRemark.charAt(0).toUpperCase() + rawRemark.slice(1)
                : null;

              // Find best matching SOC
              let matchedSoc = null;
              if (soc && socSet.has(soc.toLowerCase())) {
                const original = (socs || []).find(s => s.description.toLowerCase() === soc.toLowerCase());
                matchedSoc = original ? original.description : soc;
              } else {
                const fallback = (socs || [])
                  .filter(s => lowerText.includes(s.description.toLowerCase()))
                  .sort((a, b) => b.description.length - a.description.length);
                if (fallback.length > 0) matchedSoc = fallback[0].description;
              }

              result.push({
                negative: neg,
                soc: matchedSoc,
                noc,
                remark
              });

              // Move lowerText and original forward to search next NOC
              const nextStart = nocIndex;
              remarkOriginal = remarkOriginal.slice(nextStart);
              lowerText = lowerText.slice(nextStart);
            }
          });
        });
      }

      inSection = lower.startsWith(category.toLowerCase());
      sectionLines = inSection ? [line] : [];
    } else if (inSection) {
      sectionLines.push(line);
    }
  }

  return result;
}


//TODO:v1//
// function extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions) {
//     const result = [];
    
//     for (let i = 0; i < filterQuestion.length; i++) {
//       const currentLine = filterQuestion[i].data.trim();
  
//       if (!currentLine.toLowerCase().startsWith("human")) continue;
  
//       let soc = '';
//       let negative = '';
//       let matchedNegative = null;
  
//       if (currentLine.includes(':')) {
//         const [socPart, negativePartRaw] = currentLine.split(':').map(s => s.trim());
  
//         soc = socPart
//           .replace(/^Human\s*/i, '')
//           .replace(/\(.*?\)/g, '')
//           .trim();
  
//         const cleanedNegative = negativePartRaw.replace(/\(.*?\)/g, '').trim();
  
//         matchedNegative = negativeObsertions["Human"].find(neg =>
//           cleanedNegative.toLowerCase().includes(neg.toLowerCase())
//         );
  
//         if (matchedNegative) negative = matchedNegative;
//       } else {
//         const withoutPrefix = currentLine
//           .replace(/^Human\s*/i, '')
//           .replace(/\(.*?\)/g, '')
//           .trim();
  
//         matchedNegative = negativeObsertions["Human"].find(neg =>
//           withoutPrefix.toLowerCase().includes(neg.toLowerCase())
//         );
  
//         if (matchedNegative) {
//           negative = matchedNegative;
//           soc = withoutPrefix.split(matchedNegative)[0].trim();
//         }
//       }
  
//       if (!matchedNegative) continue;
  
//       let remarkLines = [];
//       let noc = '';
//       for (let j = i + 1; j < filterQuestion.length; j++) {
//         const nextData = filterQuestion[j].data.trim();
//         const lower = nextData.toLowerCase();
  
//         if (lower.startsWith("human")) break;
//         if (lower === "operator comments") break;
  
//         const cleaned = nextData
//           .replace(/^\d+[\.\)]?\s*/, '')
//           .replace(/\(.*?\)/g, '')
//           .trim();
  
//         const matchedNoc = nocGrouped["Human"].find(nocOption =>
//           nextData.toLowerCase().includes(nocOption.toLowerCase())
//         );
  
//         if (matchedNoc && !noc) {
//           const cleanedNoc = matchedNoc
//           .replace(/^\d+[\.\)]?\s*/, '')
//           .replace(/\(.*?\)/g, '')
//           .trim();
//           noc = cleanedNoc;
//           if (!soc) soc = cleanedNoc; // fallback
//           continue; // don't add this line to remarks
//         }
  
//         if (nextData !== '') {
//           remarkLines.push(nextData);
//         }
//       }
  
//       result.push({
//         soc,
//         negative,
//         remark: remarkLines.join(' ').trim(),
//         noc
//       });
//     }
  
//     return result;

// }


//TODO:v2//
// function extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions) {
//     const result = [];
    
//     for (let i = 0; i < filterQuestion.length; i++) {
//         const currentLine = filterQuestion[i].data.trim();

//         if (!currentLine.toLowerCase().startsWith("human")) continue;

//         let soc = '';
//         let negative = '';
//         let matchedNegative = null;

//         // Extract SOC and negative from the Human line
//         if (currentLine.includes(':')) {
//             const [socPart, negativePartRaw] = currentLine.split(':').map(s => s.trim());
//             soc = socPart.replace(/^Human\s*/i, '').replace(/\(.*?\)/g, '').trim();
//             const cleanedNegative = negativePartRaw.replace(/\(.*?\)/g, '').trim();
//             matchedNegative = negativeObsertions["Human"].find(neg =>
//                 cleanedNegative.toLowerCase().includes(neg.toLowerCase())
//             );
//             if (matchedNegative) negative = matchedNegative;
//         } else {
//             const withoutPrefix = currentLine.replace(/^Human\s*/i, '').replace(/\(.*?\)/g, '').trim();
//             matchedNegative = negativeObsertions["Human"].find(neg =>
//                 withoutPrefix.toLowerCase().includes(neg.toLowerCase())
//             );
//             if (matchedNegative) {
//                 negative = matchedNegative;
//                 soc = withoutPrefix.split(matchedNegative)[0].trim();
//             }
//         }

//         if (!matchedNegative) continue;

//         let remarkLines = [];
//         let nocs = []; // Array to store all NOCs found
        
//         for (let j = i + 1; j < filterQuestion.length; j++) {
//             const nextData = filterQuestion[j].data.trim();
//             const lower = nextData.toLowerCase();

//             if (lower.startsWith("human")) break;
//             if (lower === "operator comments") break;

//             // Check for NOC in current line
//             const matchedNoc = nocGrouped["Human"].find(nocOption =>
//                 nextData.toLowerCase().includes(nocOption.toLowerCase())
//             );

//             if (matchedNoc) {
//                 const cleanedNoc = matchedNoc
//                     .replace(/^\d+[\.\)]?\s*/, '')
//                     .replace(/\(.*?\)/g, '')
//                     .trim();
//                 nocs.push(cleanedNoc);
//                 continue; // don't add NOC line to remarks
//             }

//             if (nextData !== '') {
//                 remarkLines.push(nextData);
//             }
//         }

//         // If no NOCs found, use SOC as fallback and create one entry
//         if (nocs.length === 0) {
//             result.push({
//                 soc,
//                 negative,
//                 remark: remarkLines.join(' ').trim(),
//                 noc: soc // fallback to SOC if no NOC
//             });
//         } 
//         // If NOCs found, create separate entries for each NOC
//         else {
//             for (const noc of nocs) {
//                 result.push({
//                     soc: soc || noc, // fallback to NOC if no SOC
//                     negative,
//                     remark: remarkLines.join(' ').trim(),
//                     noc
//                 });
//             }
//         }
//     }

//     return result;
// }


function extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions) {
    const result = [];
    
    for (let i = 0; i < filterQuestion.length; i++) {
        const currentLine = filterQuestion[i].data.trim();

        if (!currentLine.toLowerCase().startsWith("human")) continue;

        let soc = '';
        let negative = '';
        let matchedNegative = null;

        // Extract SOC and negative from the Human line
        if (currentLine.includes(':')) {
            const [socPart, negativePartRaw] = currentLine.split(':').map(s => s.trim());
            soc = socPart.replace(/^Human\s*/i, '').replace(/\(.*?\)/g, '').trim();
            const cleanedNegative = negativePartRaw.replace(/\(.*?\)/g, '').trim();
            matchedNegative = negativeObsertions["Human"].find(neg =>
                cleanedNegative.toLowerCase().includes(neg.toLowerCase())
            );
            if (matchedNegative) negative = matchedNegative;
        } else {
            const withoutPrefix = currentLine.replace(/^Human\s*/i, '').replace(/\(.*?\)/g, '').trim();
            matchedNegative = negativeObsertions["Human"].find(neg =>
                withoutPrefix.toLowerCase().includes(neg.toLowerCase())
            );
            if (matchedNegative) {
                negative = matchedNegative;
                soc = withoutPrefix.split(matchedNegative)[0].trim();
            }
        }

        if (!matchedNegative) continue;

        let remarkLines = [];
        let nocs = []; // Store all found NOCs
        
        for (let j = i + 1; j < filterQuestion.length; j++) {
            const nextData = filterQuestion[j].data.trim();
            const lower = nextData.toLowerCase();

            if (lower.startsWith("human")) break;
            if (lower === "operator comments") break;

            // Check if line contains any NOC from nocGrouped["Human"]
            const matchedNoc = nocGrouped["Human"].find(nocOption => {
                const nocPattern = new RegExp(`^\\d*\\.?\\s*${escapeRegExp(nocOption)}`, 'i');
                return nocPattern.test(nextData);
            });

            if (matchedNoc) {
                const nocPattern = new RegExp(`^(\\d+\\.\\s*)?${escapeRegExp(matchedNoc)}`, 'i');
                const match = nextData.match(nocPattern);
                if (match) {
                    nocs.push(match[0].trim());
                }
                continue; // don't add NOC line to remarks
            }

            if (nextData !== '') {
                remarkLines.push(nextData);
            }
        }

        // Create entries for all found NOCs
        if (nocs.length > 0) {
            nocs.forEach(noc => {
                result.push({
                    soc,
                    negative,
                    remark: remarkLines.join(' ').trim(),
                    noc
                });
            });
        } else {
            // Fallback if no NOCs found
            result.push({
                soc,
                negative,
                remark: remarkLines.join(' ').trim(),
                noc: soc // use SOC as fallback
            });
        }
    }

    return result;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractPhotoNocObservations(filterQuestion, nocGrouped) {
  const category = "Photograph";
  const result = [];
  const baseNegatives = negativeObsertions.Photo || [];
  const validNOCs = nocGrouped[category] || [];

  for (let i = 0; i < filterQuestion.length; i++) {
    const currentLine = filterQuestion[i].data.trim();

    let matchedLine = null;

    if (currentLine.toLowerCase().startsWith(category.toLowerCase())) {
        matchedLine = currentLine;
    }

    if (!currentLine.toLowerCase().startsWith(category.toLowerCase())) continue;

    const [socPart, nocPartRaw] = currentLine.split(':').map(s => s.trim());
    let matchedNoc = '';

    let matchedNegative = null;

    if (nocPartRaw) {
      for (const phrase of baseNegatives) {
        if (matchedLine.includes(phrase.toLowerCase())) {
            matchedNegative = phrase;
            break;
        }
      }
      matchedNoc = validNOCs.find(valid =>
        nocPartRaw.toLowerCase().includes(valid.toLowerCase())
      ) || '';
    }

    if (!matchedNoc) continue;

    const remarkLines = [];
    for (let j = i + 1; j < filterQuestion.length; j++) {
      const nextLine = filterQuestion[j].data.trim();
      const lower = nextLine.toLowerCase();

      if (
        lower.startsWith("unvalidated piq responses") ||
        lower.startsWith("operator comments") ||
        lower.startsWith("operator uploaded photos") ||
        lower.startsWith("end of photo section")
      ) {
        break;
      }

      if (nextLine) {
        remarkLines.push(nextLine);
      }
    }

    result.push({
      negative: "Photo not representative",
      soc: socPart,
      noc: matchedNoc,
      remark: remarkLines.join(' ').trim()
    });
  }

  return result;
}


const exportToExcel = async (req, res) => {
  const { questions, vesselName, inspectionDate} = req.body;

  const workbook = new ExcelJS.Workbook();
  
  // Create Summary worksheet first
  const summaryWorksheet = workbook.addWorksheet('Summary');
  
  // Initialize totals with tag-based breakdown
  let totals = {
    hardware: { 
      core: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      rotational: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      total: { negative: 0, soc: 0, noc: 0, totalScore: 0 }
    },
    process: { 
      core: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      rotational: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      total: { negative: 0, soc: 0, noc: 0, totalScore: 0 }
    },
    human: { 
      core: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      rotational: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      total: { negative: 0, soc: 0, noc: 0, totalScore: 0 }
    },
    photo: { 
      core: { negative: 0, soc: 0, noc: 0, totalScore: 0 },
      // Remove rotational for photo as there are no rotational photo questions
      total: { negative: 0, soc: 0, noc: 0, totalScore: 0 }
    }
  };

  // Helper function to determine tag group
  const getTagGroup = (tag) => {
    if (tag === 'Core') return 'core';
    if (tag === 'Rotational 1' || tag === 'Rotational 2') return 'rotational';
    return 'core'; // default fallback
  };

  // Calculate totals from questions data with tag breakdown
  for (const item of questions) {
    const questionTag = item.tag || 'Core';
    const tagGroup = getTagGroup(questionTag);
    
    const hardwareList = Array.isArray(item.hardwareNegatives) ? item.hardwareNegatives : [];
    const processList = Array.isArray(item.processNegatives) ? item.processNegatives : [];
    const humanList = Array.isArray(item.humanNegatives) ? item.humanNegatives : [];
    const photoList = Array.isArray(item.photoNegatives) ? item.photoNegatives : [];

    // Calculate hardware totals
    hardwareList.forEach(hw => {
      const negative = parseInt(hw.negative) || 0;
      const soc = parseInt(hw.soc) || 0;
      const noc = parseInt(hw.noc) || 0;
      const score = parseFloat(hw.score) || 0;
      
      totals.hardware[tagGroup].negative += negative;
      totals.hardware[tagGroup].soc += soc;
      totals.hardware[tagGroup].noc += noc;
      totals.hardware[tagGroup].totalScore += score;
      
      totals.hardware.total.negative += negative;
      totals.hardware.total.soc += soc;
      totals.hardware.total.noc += noc;
      totals.hardware.total.totalScore += score;
    });

    // Calculate process totals
    processList.forEach(pr => {
      const negative = parseInt(pr.negative) || 0;
      const soc = parseInt(pr.soc) || 0;
      const noc = parseInt(pr.noc) || 0;
      const score = parseFloat(pr.score) || 0;
      
      totals.process[tagGroup].negative += negative;
      totals.process[tagGroup].soc += soc;
      totals.process[tagGroup].noc += noc;
      totals.process[tagGroup].totalScore += score;
      
      totals.process.total.negative += negative;
      totals.process.total.soc += soc;
      totals.process.total.noc += noc;
      totals.process.total.totalScore += score;
    });

    // Calculate human totals
    humanList.forEach(hm => {
      const negative = parseInt(hm.negative) || 0;
      const soc = parseInt(hm.soc) || 0;
      const noc = parseInt(hm.noc) || 0;
      const score = parseFloat(hm.score) || 0;
      
      totals.human[tagGroup].negative += negative;
      totals.human[tagGroup].soc += soc;
      totals.human[tagGroup].noc += noc;
      totals.human[tagGroup].totalScore += score;
      
      totals.human.total.negative += negative;
      totals.human.total.soc += soc;
      totals.human.total.noc += noc;
      totals.human.total.totalScore += score;
    });

    // Calculate photo totals (only core, no rotational)
    photoList.forEach(ph => {
      const negative = parseInt(ph.negative) || 0;
      const soc = parseInt(ph.soc) || 0;
      const noc = parseInt(ph.noc) || 0;
      const score = parseFloat(ph.score) || 0;
      
      // Only add to core for photos (no rotational photo questions)
      totals.photo.core.negative += negative;
      totals.photo.core.soc += soc;
      totals.photo.core.noc += noc;
      totals.photo.core.totalScore += score;
      
      totals.photo.total.negative += negative;
      totals.photo.total.soc += soc;
      totals.photo.total.noc += noc;
      totals.photo.total.totalScore += score;
    });
  }

  // Setup Summary worksheet with tag-based columns
  summaryWorksheet.columns = [
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Tag', key: 'tag', width: 12 },
    { header: 'Total Negative Response', key: 'negative', width: 25 },
    { header: 'Total SOC', key: 'soc', width: 15 },
    { header: 'Total NOC', key: 'noc', width: 15 },
    { header: 'Total Severity Score', key: 'score', width: 20 }
  ];

  // Add vessel name as title
  summaryWorksheet.mergeCells('A1:F1');
  const titleCell = summaryWorksheet.getCell('A1');
  titleCell.value = `Vessel: ${vesselName || 'N/A'}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Add inspection date under title
  summaryWorksheet.mergeCells('A2:F2');
  const dateCell = summaryWorksheet.getCell('A2');
  dateCell.value = `Inspection Date: ${inspectionDate || 'N/A'}`;
  dateCell.font = { italic: true, size: 12 };
  dateCell.alignment = { horizontal: 'center' };

  // Add empty row
  summaryWorksheet.addRow([]);

  // Add Severity Score Summary title
  summaryWorksheet.mergeCells('A4:F4');
  const summaryTitleCell = summaryWorksheet.getCell('A4');
  summaryTitleCell.value = 'Severity Score Summary';
  summaryTitleCell.font = { bold: true, size: 14 };
  summaryTitleCell.alignment = { horizontal: 'center' };

  // Add headers for simplified table
  const simpleHeaderRow = summaryWorksheet.addRow([
    'Total Core Severity score', 
    'Total Rotational Severity score', 
    'Total Severity Score '
  ], 5); // Row 5

  // Style simple header row
  simpleHeaderRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Set wider column widths to fit header text
  summaryWorksheet.getColumn(1).width = 30; // For 'Total Core Severity score'
  summaryWorksheet.getColumn(2).width = 35; // For 'Total Rotational Severity score'
  summaryWorksheet.getColumn(3).width = 30;

  // Calculate totals (photo only has core, no rotational)
  const totalCoreScore = (totals.hardware.core.totalScore + 
                         totals.process.core.totalScore + 
                         totals.human.core.totalScore + 
                         totals.photo.core.totalScore).toFixed(2);

  const totalRotationalScore = (totals.hardware.rotational.totalScore + 
                               totals.process.rotational.totalScore + 
                               totals.human.rotational.totalScore).toFixed(2); // No photo rotational

  const combinedTotalScore = (parseFloat(totalCoreScore) + parseFloat(totalRotationalScore)).toFixed(2);

  // Add data row
  const simpleDataRow = summaryWorksheet.addRow([
    totalCoreScore,
    totalRotationalScore,
    combinedTotalScore
  ]);

  // Style data row
  simpleDataRow.eachCell(cell => {
    cell.alignment = { horizontal: 'center' };
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' } // Light blue
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add empty row before detailed table
  summaryWorksheet.addRow([]);
  summaryWorksheet.addRow([]);

  // Style summary header row
  const summaryHeaderRow = summaryWorksheet.getRow(3);
  summaryHeaderRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add summary data rows with tag breakdown (modified for photo)
  const summaryData = [
    // Hardware rows
    { category: 'Hardware', tag: 'Core', ...totals.hardware.core },
    { category: 'Hardware', tag: 'Rotational', ...totals.hardware.rotational },
    { category: 'Hardware', tag: 'Total', ...totals.hardware.total },
    
    // Process rows  
    { category: 'Process', tag: 'Core', ...totals.process.core },
    { category: 'Process', tag: 'Rotational', ...totals.process.rotational },
    { category: 'Process', tag: 'Total', ...totals.process.total },
    
    // Human rows
    { category: 'Human', tag: 'Core', ...totals.human.core },
    { category: 'Human', tag: 'Rotational', ...totals.human.rotational },
    { category: 'Human', tag: 'Total', ...totals.human.total },
    
    // Photo rows (only core and total, no rotational)
    { category: 'Photo', tag: 'Core', ...totals.photo.core },
    { category: 'Photo', tag: 'Total', ...totals.photo.total }
  ];

  summaryData.forEach((data, index) => {
    const row = summaryWorksheet.addRow({
      category: data.category,
      tag: data.tag,
      negative: data.negative,
      soc: data.soc,
      noc: data.noc,
      score: data.totalScore.toFixed(2)
    });

    // Style data rows
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Highlight total rows
      if (data.tag === 'Total') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8FF' }
        };
        cell.font = { bold: true };
      }
    });
  });

  // Add grand totals row
  const grandTotalRow = summaryWorksheet.addRow({
    category: 'TOTAL',
    tag: 'All',
    negative: totals.hardware.total.negative + totals.process.total.negative + totals.human.total.negative + totals.photo.total.negative,
    soc: totals.hardware.total.soc + totals.process.total.soc + totals.human.total.soc + totals.photo.total.soc,
    noc: totals.hardware.total.noc + totals.process.total.noc + totals.human.total.noc + totals.photo.total.noc,
    score: (totals.hardware.total.totalScore + totals.process.total.totalScore + totals.human.total.totalScore + totals.photo.total.totalScore).toFixed(2)
  });

  // Style grand total row
  grandTotalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thick' },
      left: { style: 'thin' },
      bottom: { style: 'thick' },
      right: { style: 'thin' }
    };
  });

  summaryWorksheet.addRow([]);

  // Helper function to create category worksheets with proper data filtering
  const createCategoryWorksheet = (workbook, categoryName, categoryKey, questions) => {
    const worksheet = workbook.addWorksheet(categoryName);
    
    const headerRow = [
      "VIQ NO.",
      "Question",
      "Tag",
      "Inspector Remark",
      `${categoryName} Negative Response`,
      `${categoryName} SOC`,
      `${categoryName} NOC`, 
      `${categoryName} Severity Score`
    ];

    // Add header row
    const headerRowObj = worksheet.addRow(headerRow);
    headerRowObj.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Set column widths
    worksheet.columns = [
      { width: 10 }, // VIQ NO
      { width: 40 }, // Question
      { width: 15 }, // Tag
      { width: 30 }, // Inspector Remark
      { width: 20 }, // Negative Response
      { width: 15 }, // SOC
      { width: 15 }, // NOC
      { width: 20 }  // Severity Score
    ];

    let hasData = false;

    // Add data rows - only for questions that have data for this specific category
    for (const item of questions) {
      const categoryList = Array.isArray(item[categoryKey]) ? item[categoryKey] : [];
      
      // Only add rows if this category has data for this question
      if (categoryList.length > 0) {
        hasData = true;
        // Add rows for each entry in this category
        categoryList.forEach((entry, index) => {
          const dataRow = worksheet.addRow([
            index === 0 ? item.question_no : '',
            index === 0 ? item.question : '',
            index === 0 ? (item.tag || 'Core') : '',
            entry.remark || '',
            entry.negative || '',
            entry.soc || '',
            entry.noc || '',
            entry.score || ''
          ]);

          // Apply styling
          dataRow.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'top', wrapText: true };
            
            // Remark column styling (column 4)
            if (colNumber === 4) {
              cell.font = { color: { argb: 'FF0000' } };
            }
          });
        });
      }
    }

    // If no data found, add a "No data available" message
    if (!hasData) {
      const noDataRow = worksheet.addRow(['', 'No data available for this category', '', '', '', '', '', '']);
      noDataRow.getCell(2).font = { italic: true, color: { argb: 'FF666666' } };
      noDataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Merge cells for the message
      worksheet.mergeCells(`B${noDataRow.number}:H${noDataRow.number}`);
    }
  };

  // Create separate worksheets for each category with proper data filtering
  createCategoryWorksheet(workbook, 'Hardware', 'hardwareNegatives', questions);
  createCategoryWorksheet(workbook, 'Process', 'processNegatives', questions);
  createCategoryWorksheet(workbook, 'Human', 'humanNegatives', questions);
  createCategoryWorksheet(workbook, 'Photo', 'photoNegatives', questions);

  const formattedName = formatVesselName(vesselName);
  const fileName = `${formattedName}_${moment().unix()}.xlsx`;
  const filepath = path.join(outputPath, fileName);

  await workbook.xlsx.writeFile(filepath);
  
  res.status(200).json({
    message: "Excel file created successfully",
    success: true,
    filePath: filepath
  });
};

function formatVesselName(name) {
    return name.toLowerCase().replace(/\s+/g, '_');
}

// function extractOperatorComments(filterQuestion) {
//   const operatorComments = [];
//   const pifData = [];
//   let currentPIF = "";
//   let inOperatorSection = false;
//   let currentComment = {};
//   let currentField = "";
//   let fieldContent = "";
  
//   for (let i = 0; i < filterQuestion.length; i++) {
//     const line = filterQuestion[i].data.trim();
    
//     if (!line) continue;
    
//     // Detect PIF patterns (numbered items that describe performance factors)
//     if (line.match(/^\d+\.\s+/) && !inOperatorSection) {
//       // ADDED: Save previous PIF if it exists (for positive PIFs without operator comments)
//       if (currentPIF) {
//         pifData.push({
//           pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
//           pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
//         });
//       }
      
//       currentPIF = line;
//       continue;
//     }
    
//     // Detect start of Operator Comments section
//     if (line.toLowerCase().includes("operator comments")) {
//       if (currentComment && Object.keys(currentComment).length > 0) {
//         operatorComments.push({...currentComment});
//       }
      
//       // Add PIF to separate array
//       // if (currentPIF) {
//       //   pifData.push({
//       //     pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
//       //     pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
//       //   });
//       // }
//       if (currentPIF && !inOperatorSection) {
//         pifData.push({
//           pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
//           pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
//         });
//       }

//       inOperatorSection = true;
//       currentComment = {};
//       currentField = "";
//       fieldContent = "";
//       currentPIF = "";
//       continue;
//     }
    
//     if (inOperatorSection) {
//       // Check for section end
//       if (line.toLowerCase().match(/^(human|process|hardware|photograph)/) || 
//          // line.match(/^\d+\.\s+/)) {
//         line.match(/^\d+\.\s+/) ||
//         line.match(/^\d+\.\d+(\.\d+)?\s*-/) ||
//         line.match(/^\d+\.\d+(\.\d+)?\.\s+\w/) ||
//         line.toLowerCase().includes("operator attachments")) {

//         // Save current field content
//         if (currentField && fieldContent) {
//           currentComment[currentField] = fieldContent.trim();
//         }
//         // Save current comment
//         if (Object.keys(currentComment).length > 0) {
//           operatorComments.push({...currentComment});
//         }
        
//         inOperatorSection = false;
//         currentComment = {};
        
//         // If this is a new PIF, update it
//         if (line.match(/^\d+\.\s+/)) {
//           currentPIF = line;
//         }
//         continue;
//       }
      
//       // Extract author and date
//       const authorMatch = line.match(/(\d{2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2})\s+by\s+(.+)/i);
//       if (authorMatch) {
//         currentComment.date = authorMatch[1];
//         currentComment.name = authorMatch[2];
//         continue;
//       }
      
//       // Check for field headers
//       if (line.toLowerCase().startsWith("immediate cause")) {
//         if (currentField && fieldContent) {
//           currentComment[currentField] = fieldContent.trim();
//         }
//         currentField = "immediateCause";
//         fieldContent = line.replace(/immediate cause\s*:?\s*/i, '').trim();
//         continue;
//       }
      
//       if (line.toLowerCase().startsWith("root cause")) {
//         if (currentField && fieldContent) {
//           currentComment[currentField] = fieldContent.trim();
//         }
//         currentField = "rootCause";
//         fieldContent = line.replace(/root cause\s*:?\s*/i, '').trim();
//         continue;
//       }
      
//       if (line.toLowerCase().startsWith("corrective action")) {
//         if (currentField && fieldContent) {
//           currentComment[currentField] = fieldContent.trim();
//         }
//         currentField = "correctiveAction";
//         fieldContent = line.replace(/corrective action\s*:?\s*/i, '').trim();
//         continue;
//       }
      
//       if (line.toLowerCase().startsWith("preventative action")) {
//         if (currentField && fieldContent) {
//           currentComment[currentField] = fieldContent.trim();
//         }
//         currentField = "preventativeAction";
//         fieldContent = line.replace(/preventative action\s*:?\s*/i, '').trim();
//         continue;
//       }
      
//       // Add to current field content
//   //     if (currentField) {
//   //       fieldContent += " " + line;
//   //     }
//   //   }
//   // }
//    if (currentField) {
//         fieldContent += " " + line;
//       }
//     } else {
//       // ADDED: If we're not in operator section and not a PIF header, 
//       // add content to current PIF description
//       if (currentPIF && !line.match(/^\d+\.\s+/)) {
//         currentPIF += " " + line;
//       }
//     }
//   }
  
//   // Don't forget the last comment
//   if (inOperatorSection && Object.keys(currentComment).length > 0) {
//     if (currentField && fieldContent) {
//       currentComment[currentField] = fieldContent.trim();
//     }
//     operatorComments.push({...currentComment});
//   }
  
//   // ADDED: Don't forget the last PIF (for positive PIFs at end of text)
//   if (currentPIF && !inOperatorSection) {
//     pifData.push({
//       pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
//       pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
//     });
//   }
  
//   return {
//     operatorComments,
//     pifData
//   };
// }
function extractOperatorComments(filterQuestion) {
  const operatorComments = [];
  const pifData = [];
  let currentPIF = "";
  let inOperatorSection = false;
  let currentComment = {};
  let currentField = "";
  let fieldContent = "";
  
  // DEBUG: Add logging to track what's happening
  console.log("=== DEBUGGING EXTRACTION ===");
  
  for (let i = 0; i < filterQuestion.length; i++) {
    const line = filterQuestion[i].data.trim();
    
    if (!line) continue;
    
    // DEBUG: Log each line being processed
    console.log(`Line ${i}: "${line}" | inOperatorSection: ${inOperatorSection}`);
    
    // Detect start of Operator Comments section FIRST (highest priority)
    if (line.toLowerCase().includes("operator comments")) {
      console.log(`🟡 ENTERING OPERATOR SECTION at line: "${line}"`);
      
      // Save current comment if exists
      if (currentComment && Object.keys(currentComment).length > 0) {
        operatorComments.push({...currentComment});
      }
      
      // Save the PIF that this operator comment belongs to
      if (currentPIF && isValidPIF(currentPIF)) {
        console.log(`📝 SAVING PIF WITH OPERATOR COMMENTS: "${currentPIF}"`);
        pifData.push({
          pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
          pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
        });
      }
      
      inOperatorSection = true;
      currentComment = {};
      currentField = "";
      fieldContent = "";
      currentPIF = ""; // Clear current PIF since we're processing its operator comments
      continue;
    }
    
    // If we're inside operator section, handle operator content
    if (inOperatorSection) {
      console.log(`🔴 PROCESSING OPERATOR CONTENT: "${line}"`);
      
      // Check for section end - structural patterns OR new PIF
      if (line.toLowerCase().match(/^(human|process|hardware|photograph)/) || 
         line.match(/^\d+\.\d+(\.\d+)?\s*-/) ||
         line.match(/^\d+\.\d+(\.\d+)?\.\s+\w/) ||
         line.toLowerCase().includes("operator attachments") ||
         isValidPIF(line)) {  // NEW PIF also ends operator section
        
        console.log(`🟢 EXITING OPERATOR SECTION at line: "${line}"`);
        // Save current field content
        if (currentField && fieldContent) {
          currentComment[currentField] = fieldContent.trim();
        }
        // Save current comment
        if (Object.keys(currentComment).length > 0) {
          operatorComments.push({...currentComment});
        }
        
        inOperatorSection = false;
        currentComment = {};
        currentField = "";
        fieldContent = "";
        
        // If this line is a new PIF, start processing it
        if (isValidPIF(line)) {
          console.log(`🔵 NEW PIF AFTER OPERATOR SECTION: "${line}"`);
          currentPIF = line;
        }
        continue;
      }
      
      // Extract author and date
      const authorMatch = line.match(/(\d{2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2})\s+by\s+(.+)/i);
      if (authorMatch) {
        currentComment.date = authorMatch[1];
        currentComment.name = authorMatch[2];
        continue;
      }
      
      // COMPLETELY IGNORE any line that looks like a PIF inside operator comments
      // (this handles cases like "2023. Company..." inside operator text)
      if (line.match(/^\d+\.\s+/) && !isValidPIF(line)) {
        console.log(`⚠️ IGNORING INVALID PIF-LIKE PATTERN INSIDE OPERATOR COMMENTS: "${line}"`);
        // Treat it as regular operator comment content
        if (currentField) {
          fieldContent += " " + line;
        }
        continue;
      }
      
      // Check for field headers
      if (line.toLowerCase().startsWith("immediate cause")) {
        if (currentField && fieldContent) {
          currentComment[currentField] = fieldContent.trim();
        }
        currentField = "immediateCause";
        fieldContent = line.replace(/immediate cause\s*:?\s*/i, '').trim();
        continue;
      }
      
      if (line.toLowerCase().startsWith("root cause")) {
        if (currentField && fieldContent) {
          currentComment[currentField] = fieldContent.trim();
        }
        currentField = "rootCause";
        fieldContent = line.replace(/root cause\s*:?\s*/i, '').trim();
        continue;
      }
      
      if (line.toLowerCase().startsWith("corrective action")) {
        if (currentField && fieldContent) {
          currentComment[currentField] = fieldContent.trim();
        }
        currentField = "correctiveAction";
        fieldContent = line.replace(/corrective action\s*:?\s*/i, '').trim();
        continue;
      }
      
      if (line.toLowerCase().startsWith("preventative action")) {
        if (currentField && fieldContent) {
          currentComment[currentField] = fieldContent.trim();
        }
        currentField = "preventativeAction";
        fieldContent = line.replace(/preventative action\s*:?\s*/i, '').trim();
        continue;
      }
      
      // Add content to current field
      if (currentField) {
        fieldContent += " " + line;
      }
      
      // SKIP everything else when in operator section - no PIF processing
      continue;
    }
    
    // Process PIFs when NOT in operator section
    if (!inOperatorSection && isValidPIF(line)) {
      console.log(`🔵 FOUND PIF: "${line}"`);
      // Save previous PIF if it exists (this handles positive PIFs without operator comments)
      if (currentPIF && isValidPIF(currentPIF)) {
        console.log(`📝 SAVING PREVIOUS PIF (POSITIVE): "${currentPIF}"`);
        pifData.push({
          pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
          pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
        });
      }
      
      currentPIF = line;
      continue;
    }
    
    // Add content to current PIF when not in operator section
    if (!inOperatorSection && currentPIF && !isValidPIF(line)) {
      console.log(`📝 ADDING TO CURRENT PIF: "${line}"`);
      currentPIF += " " + line;
    }
  }
  
  // Save final comment if we ended while in operator section
  if (inOperatorSection && Object.keys(currentComment).length > 0) {
    if (currentField && fieldContent) {
      currentComment[currentField] = fieldContent.trim();
    }
    operatorComments.push({...currentComment});
  }
  
  // Save final PIF if it exists and we're not in operator section (positive PIF at end)
  if (currentPIF && !inOperatorSection && isValidPIF(currentPIF)) {
    console.log(`📝 SAVING FINAL PIF (POSITIVE): "${currentPIF}"`);
    pifData.push({
      pifNumber: currentPIF.match(/^\d+/)?.[0] || "",
      pifDescription: currentPIF.replace(/^\d+\.\s*/, '').trim()
    });
  }
  
  console.log("=== FINAL RESULTS ===");
  console.log("PIFs found:", pifData);
  console.log("Operator comments found:", operatorComments.length);
  
  return {
    operatorComments,
    pifData
  };
}

// Helper function to validate if a line is a legitimate PIF
function isValidPIF(line) {
  // Must start with a number 1-20, followed by period, space, and meaningful content
  // Must NOT contain operator comment keywords that suggest it's part of operator content
  const pifPattern = /^([1-9]|1[0-9]|20)\.\s+\w/;
  const hasOperatorKeywords = /\b(root cause|corrective action|preventative action|immediate cause)\b/i.test(line);
  const hasDatePattern = /\b\d{2}\s+\w{3}\s+\d{4}\b/.test(line); // Date like "11 Oct 2024"
  const isYearPattern = /^(19|20)\d{2}\.\s/.test(line); // Starts with year like "2023. "
  const isVeryLong = line.length > 500; // PIFs shouldn't be extremely long on first line
  
  return pifPattern.test(line) && 
         !hasOperatorKeywords && 
         !hasDatePattern && 
         !isYearPattern &&
         !isVeryLong;
}

function extractTMSA(filterQuestion) {
  // const tmsaData = [];
  
  for (let i = 0; i < filterQuestion.length; i++) {
    const line = filterQuestion[i].data.trim();
    
    if (!line) continue;

     const tmsaMatch = line.match(/(\d+[A-Z]?\.\d+\.\d+(?:\.\d+)?)\s*-\s*(.+)/);
    if (tmsaMatch) {
      return tmsaMatch[1]; // Return the first match found
    }
    
    // Alternative: standalone TMSA number on its own line
    const standaloneTmsaMatch = line.match(/^(\d+[A-Z]?\.\d+\.\d+(?:\.\d+)?)$/);
    if (standaloneTmsaMatch) {
      return standaloneTmsaMatch[1]; // Return the first match found
    } 
    // const tmsaMatch = line.match(/(\d+[A-Z]?\.\d+\.\d+(?:\.\d+)?)\s*-\s*(.+)/);
    // if (tmsaMatch) {
    //   tmsaData.push({
    //     tmsa: tmsaMatch[1],
    //     // tmsaDescription: tmsaMatch[2].trim()
    //   });
    //   continue;
    // }
    
    // // Alternative: standalone TMSA number on its own line
    // const standaloneTmsaMatch = line.match(/^(\d+[A-Z]?\.\d+\.\d+(?:\.\d+)?)$/);
    // if (standaloneTmsaMatch) {
    //   tmsaData.push({
    //     tmsa: standaloneTmsaMatch[1],
    //     tmsaDescription: "" // No description available
    //   });
    //   continue;
    // }

    
    // Stop processing if we hit Operator Comments section
    if (line.toLowerCase().includes("operator comments")) {
      break;
    }
  }
  
  return null;
}

module.exports = {
    convertToExcel,
    exportToExcel
}