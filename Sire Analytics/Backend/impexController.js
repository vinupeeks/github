const callPythonScript = require("../helper/callConvertScript");
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const moment = require('moment');
const outputPath = './files/excel'
const chapters = require('../constants/chapter.json')
const sections = require('../constants/section.json');
const socs = require('../constants/soc.json')
const db = require('../models');
const { formatScoreMap, getFormattedUserScoreMap } = require("../utils/formatScoreMap");
const extractKeyValuePairs = require("../utils/extractKeyValuePairs");
const { formatInspectionDate } = require("../utils/inspectionUtils");
const Vessels = db.vessels
const VesselInspections = db.vesselInspections
const InspectionQuestions = db.inspectionQuestions
const InspectionAllQuestions = db.inspectionAllQuestions;
const InspectionScore = db.inspectionScore
const Op = db.Sequelize.Op
const Questions = db.questions
const Superintendents = db.superintendents
const Fleets = db.fleets
const InspectionScoreHistory = db.inspectionScoreHistory

const negativeObsertions = {
    "Hardware": ["Observable or detectable deficiency."],
    "Process": ["Not as expected – procedure and/or document deficient.", "Largely as expected - procedure and/or document present.", "Largely as expected."],
    "Human": ["Not as expected.", "Largely as expected."],
    "Photograph": ["Photo not representative."]
}

const positiveObsertions = {
    "Human": ["Exceeded normal expectation"]
}

const largelyObservations = ["Largely as expected - procedure and/or document present.", "Largely as expected."]

const nocGrouped = {
    "Hardware": [
        "Sudden failure – maintenance tasks available and up to date",
        "Maintenance task available – not completed",
        "Maintenance task available – records incompatible with condition seen",
        "No maintenance task developed",
        "Maintenance deferred – awaiting spares",
        "Maintenance deferred – awaiting technician",
        "Maintenance deferred – awaiting out of service / gas free",
        "Other - Text",
        "Other - text",
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
        "Other - text",
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
    try {
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
                        if (q.tag === "Core") {
                            score = scoreMap.Hardware[noc]?.coreVIQ;
                        } else if (q.tag === "Rotational 1" || q.tag === "Rotational 2") {
                            score = scoreMap.Hardware[noc]?.rotationalVIQ;
                        }
                    }

                    if (category === 'processNegatives') {
                        if (q.tag === "Core") {
                            score = scoreMap.Process[noc]?.coreVIQ;
                        } else if (q.tag === "Rotational 1" || q.tag === "Rotational 2") {
                            score = scoreMap.Process[noc]?.rotationalVIQ;
                        }
                    }

                    if (category === 'humanNegatives') {
                        const role = soc?.includes('junior') || soc?.includes('rating') ? 'Junior' : 'Senior';
                        if (q.tag === "Core") {
                            score = scoreMap.Human[role][noc]?.coreVIQ;
                        } else if (q.tag === "Rotational 1" || q.tag === "Rotational 2") {
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
    catch (err) {
        console.log(err)
    }
};

const getQuestionData = async () => {
    try {
        const response = await Questions.findAll({ attributes: ['question_no', 'tag'], raw: true });
        return response;
    } catch (error) {
        console.error('Error fetching question data:', error);
        return null;
    }
}

const convertToExcel = async (req, res) => {
    try {

        const { filename } = req.body

        const allQuestionData = await getQuestionData();

        const file = await callPythonScript(filename);

        const outputFileName = file.jsonFilePath

        const data = JSON.parse(fs.readFileSync(outputFileName, 'utf-8'));
        // const data = JSON.parse(fs.readFileSync("./files/output_20250602_211244.json", 'utf-8'));

        const text = file.page2Text

        const reportNo = text.match(/Report for.*\[(.*?)\]/)?.[1] || null;
        const inspectionData = extractKeyValuePairs(text);

        const rawDate = inspectionData.inspection_date;
        const formattedDate = formatInspectionDate(rawDate)

        const filteredData = data.filter(item => {
            return !sections.some(section => item.content.includes(section));
        });

        let index = 0
        let array = []

        const marineForumRegex = /© \d{4} Oil Companies International Marine Forum/;

        filteredData.forEach(i => {
            if (
                i.content !== "" &&
                i.content !== " " &&
                i.content !== data[0].content &&
                !marineForumRegex.test(i.content)
            ) {
                array.push({ data: i.content, index: index++ })
            }
        });

        const response = await chapterWiseSort(array, allQuestionData)
        const questionsWithNegatives = response.questionsWithNegatives;
        const allQuestionsData = response.allQuestions;

        const user = (req.user.role_id === 1 && req.body.user) ? req.body.user : req.user

        const newScoredData = await applyScores(questionsWithNegatives, user.id);

        const filePath = path.join(__dirname, '../../', outputFileName);

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });

        const formatInspectionData = {
            report_no: reportNo,
            user,
            filename,
            ...inspectionData,
            inspection_date: formattedDate
        }

        const insertData = await createVesselWithInspectionAndScores(newScoredData, allQuestionsData, formatInspectionData)

        if (insertData.success) {
            res.status(200).json({ message: insertData.message, success: true });
        } else {
            res.status(500).json({ message: insertData.message, success: false });
        }

    }
    catch (err) {
        console.log(err)
    }
}

const parsePifFromNoc = (noc) => {
    if (typeof noc !== "string") return null;
    const match = noc.trim().match(/^(\d+)\s*(?:[.)\-–])\s*(.+)$/);
    if (!match) return null;
    const [, num, desc] = match;
    return [{ pifNumber: String(num), pifDescription: desc.trim() }];
};

const parseTmsaFromSoc = (soc) => {
    if (typeof soc !== "string") return null;
    const match = soc.match(/(\d+[A-Z]?(?:\.\d+){0,3})/i);
    return match ? match[1].toUpperCase() : null;
};

async function createVesselWithInspectionAndScores(newScoredData, allQuestionsData, formatInspectionData) {

    const {
        imo, vessel_name, inspection_date, user, operation, report_no, inspecting_company,
        filename, port, flag
    } = formatInspectionData

    const [fleet, fleetCreated] = await Fleets.findOrCreate({
        where: { user_id: user.id },
        defaults: { name: "FLEET 1", user_id: user.id }
    });

    const [superintendent, superintendentCreated] = await Superintendents.findOrCreate({
        where: { user_id: user.id },
        defaults: { name: "SUPERINTENDENT 1", fleet_id: fleet.id, user_id: user.id }
    });

    const assigned_user_id = user.id === user.user_id ? null : user.user_id

    let vessel = await Vessels.findOne({ where: { imo, user_id: user.id } });

    const assigned_vessel_only = user.user_permission ? user.user_permission.assigned_vessel_only : false

    if ( vessel && (
        (user.role_id === 2 && user.id !== vessel.user_id) ||
        (user.role_id === 3 && user.user_id !== vessel.assigned_user_id && assigned_vessel_only))
    ) {
        return {
            success: false,
            message: "This imo number already belongs to another vessel."
        };
    }


    if (!vessel) {

        const max = Number(user.maximum_vessels);
        const count = Number(user.count_of_vessels);

        if (count > max -1) {
            return {
                success: false,
                message: "You have reached the maximum number of vessels."
            }
        }

        vessel = await Vessels.create({
            imo,
            name: vessel_name,
            assigned_user_id,
            user_id: user.id,
            fleet_id: fleet.id,
            super_id: superintendent.id,
            created_by: user.id,
            updated_by: user.id
        });
    }

    if (!vessel_name && vessel) {
        await vessel.update({name: vessel_name});
    }

    const inspection = await VesselInspections.findOne({
        where: {
            [Op.and]: [{ vessel_id: vessel.id }, { report_date: inspection_date }, { status: { [Op.ne]: "deleted" } }],
        }
    })

    if (inspection) {
        await updateVesselWithInspectionScores(inspection, newScoredData, allQuestionsData, formatInspectionData, vessel)
        return {
            success: true,
            message: "Report regenerated successfully"
        }
    }

    const vesselInspection = await VesselInspections.create({
        user_id: user.id,
        vessel_id: vessel.id,
        fleet_id: vessel.fleet_id,
        old_fleet_id: vessel.fleet_id,
        super_id: vessel.super_id,
        old_super_id: vessel.super_id,
        report_date: inspection_date,
        report_name: filename,
        vesselsOperation: operation,
        company_name: inspecting_company,
        port_name: port,
        country: flag,
        created_by: user.id,
        updated_by: user.id
    });

    for (const item of allQuestionsData) {
        const allQuestions = await InspectionAllQuestions.create({
            user_id: user.id,
            vessel_id: vessel.id,
            inspection_id: vesselInspection.id,
            report_date: inspection_date,
            viq: item.viq,
            tag: item.tag,
            chapter_no: item.chapter_no,
            isNegative: item.isNegative,
            created_by: user.id,
            updated_by: user.id
        });
    }

    for (const item of newScoredData) {
        const question = await InspectionQuestions.create({
            inspection_id: vesselInspection.id,
            viq: item.question_no,
            question: item.question,
            tag: item.tag,
            chapter_no: item.chapter_no,
            created_by: user.id,
            updated_by: user.id
        });

        if (!question) continue;

        const scoresToInsert = [];

        const fetchScoreData = (negatives, category, isPositive) => {

            if (!Array.isArray(negatives)) return;

            for (const neg of negatives) {

                const isOperatorComments = Array.isArray(neg.operatorComments)
                const operatorComments = isOperatorComments ? neg?.operatorComments : null

                const derivedPif = parsePifFromNoc(neg?.noc)
                const tmsa = parseTmsaFromSoc(neg?.soc);
                const largely = largelyObservations.includes(neg.negative)

                scoresToInsert.push({
                    question_id: question.id,
                    negative: neg.negative,
                    noc: neg.noc,
                    soc: neg.soc,
                    remark: neg.remark,
                    score: largely ? 0 : neg.score,
                    category,
                    isNegative: isPositive ? "no" : largely ? "largely" : "yes",
                    operator_comments: operatorComments,
                    pif: derivedPif,
                    tmsa: tmsa,
                    statusData: isPositive ? null : 'Open',
                    created_by: user.id,
                    updated_by: user.id
                });
            }
        };

        fetchScoreData(item.hardwareNegatives, "hardware");
        fetchScoreData(item.processNegatives, "process");
        fetchScoreData(item.humanNegatives, "human");
        fetchScoreData(item.photoNegatives, "photo");
        fetchScoreData(item.humanPositives, "human", true);

        if (scoresToInsert.length > 0) {
            await InspectionScore.bulkCreate(
                scoresToInsert,
                { returning: true }
            );
        }

    }

    return {
        success: true,
        message: "Success"
    }

}

async function updateVesselWithInspectionScores(inspection, newScoredData, allQuestionsData, formatInspectionData, vessel) {

    const { user, inspection_date } = formatInspectionData

    const qstns = await InspectionQuestions.findAll({ where: { inspection_id: inspection.id } })
    const qIds = qstns.map(element => element.id)

    const oldScores = await InspectionScore.findAll({
        where: {
            question_id: {
                [Op.in]: qIds
            }
        }
    })

    const scoresToInsert = [];

    for (const item of newScoredData) {

        const question = await InspectionQuestions.create({
            inspection_id: inspection.id,
            viq: item.question_no,
            question: item.question,
            tag: item.tag,
            chapter_no: item.chapter_no,
            created_by: user.id,
            updated_by: user.id
        });

        if (!question) continue;

        const fetchScoreData = async (negatives, category, isPositive) => {

            if (!Array.isArray(negatives)) return;

            let obs = []

            for (const neg of negatives) {

                const isOperatorComments = Array.isArray(neg.operatorComments)
                const operatorComments = isOperatorComments ? neg?.operatorComments : null

                const derivedPif = parsePifFromNoc(neg?.noc)
                const tmsa = parseTmsaFromSoc(neg?.soc);

                const ob = oldScores.find(e => e.negative === neg.negative && e.noc === neg.noc && e.soc === neg.soc && e.category === category)
                const largely = largelyObservations.includes(neg.negative)

                obs.push({
                    question_id: question.id,
                    negative: neg.negative,
                    noc: neg.noc,
                    soc: neg.soc,
                    remark: neg.remark,
                    score: neg.score,
                    category,
                    isNegative: isPositive ? "no" : largely ? "largely" : "yes",
                    operator_comments: operatorComments,
                    pif: derivedPif,
                    tmsa: tmsa,
                    statusData: isPositive ? null : 'Open',
                    created_by: user.id,
                    updated_by: user.id,
                    ...ob ? {
                        statusData: ob.statusData,
                        isWrong: ob.isWrong,
                        human_name: ob.human_name,
                        crew_id: ob.crew_id,
                        risk: ob.risk,
                        score: neg.score || ob.score
                    } : {}
                });
            }

            scoresToInsert.push(...obs)

        };

        fetchScoreData(item.hardwareNegatives, "hardware");
        fetchScoreData(item.processNegatives, "process");
        fetchScoreData(item.humanNegatives, "human");
        fetchScoreData(item.photoNegatives, "photo");
        fetchScoreData(item.humanPositives, "human", true);

    }

    await InspectionScore.bulkCreate(scoresToInsert)

    await InspectionScore.destroy({
        where: {
            question_id: {
                [Op.in]: qIds
            }
        }
    });
    await InspectionQuestions.destroy({ where: { id: { [Op.in]: qIds } } })
    await InspectionAllQuestions.destroy({
        where: {
            vessel_id: vessel.id,
            inspection_id: inspection.id
        }
    })

    for (const item of allQuestionsData) {
        await InspectionAllQuestions.create({
            user_id: user.id,
            vessel_id: vessel.id,
            inspection_id: inspection.id,
            report_date: inspection_date,
            viq: item.viq,
            tag: item.tag,
            chapter_no: item.chapter_no,
            isNegative: item.isNegative,
            created_by: user.id,
            updated_by: user.id
        });
    }

}

const chapterWiseSort = async (data, allQuestionData) => {

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
    for (let i = 0; i < uniqueData.length; i++) {
        array.push({
            data: uniqueData[i].data,
            startIndex: uniqueData[i].index,
            endIndex: uniqueData[i + 1] ? uniqueData[i + 1].index - 1 : data.length
        })
    }

    const response = await chapterWiseFilter(data, array, allQuestionData)

    return response
}

const chapterWiseFilter = async (data, array, allQuestionData) => {
    let datas = []
    let allQuestions = [];

    for (let i = 0; i < array.length; i++) {
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

        for (let i = 0; i < uniqueData.length; i++) {
            // for(let i = 0; i < 4; i++) {
            const startIndex = uniqueData[i].index
            const endIndex = uniqueData[i + 1] ? uniqueData[i + 1].index - 1 : data.length
            const filterQuestion = filteredData.filter(item => item.index >= startIndex && item.index <= endIndex)

            const piq = filterQuestion.find(item => item.data.includes("PIQ additional data"));
            const hw = filterQuestion.find(item => item.data.includes("Hardware"))
            const pr = filterQuestion.find(item => item.data.includes("Process"))
            const hu = filterQuestion.find(item => item.data.includes("Human"))
            const py = filterQuestion.find(item => item.data.includes("Operator uploaded photos"))
            const questionSlice = piq ? piq.index - startIndex : py ? py.index - startIndex : hw ? hw.index - startIndex : pr ? pr.index - startIndex : hu ? hu.index - startIndex : filterQuestion.length

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
            const currentQuestion = allQuestionData.find(e => e.question_no === concatenatedViq);

            const hardwareNegatives = extractStandardCategoryNegatives(filterQuestion, 'Hardware', nocGrouped, negativeObsertions);
            const processNegatives = extractStandardCategoryNegatives(filterQuestion, 'Process', nocGrouped, negativeObsertions);
            const humanNegatives = extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions);
            const humanPositives = extractValidHumanNegatives(filterQuestion, nocGrouped, positiveObsertions);
            const photoNegatives = extractPhotoNocObservations(filterQuestion, nocGrouped);
            // const operatorComments = extractOperatorComments(filterQuestion);

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
                // operatorComments
            }

            // Store ALL questions in the separate array
            const allQuestionDataItem = {
                viq: concatenatedNumbers,
                tag: currentQuestion ? currentQuestion.tag : '',
                chapter_no,
                isNegative:
                    (hardwareNegatives.length > 0 ||
                        processNegatives.length > 0 ||
                        humanNegatives.length > 0 ||
                        humanPositives.length > 0 ||
                        photoNegatives.length > 0)
                        ? "yes"
                        : "no"
            }

            allQuestions.push(allQuestionDataItem);

            if (allQuestionDataItem.isNegative === "yes") {
                qst.push(newData)
            }

        }

        datas.push(...qst)
    }

    return {
        questionsWithNegatives: datas,
        allQuestions: allQuestions
    }

}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const CLEAN = s => (s || '').trim();

function parseOperatorCommentsFromText(textAfterNoc, socNames = [], nocList = []) {
    const src = textAfterNoc || '';
    const lower = src.toLowerCase();

    const ocStart = lower.indexOf('operator comments');
    if (ocStart === -1) return { oc: null, consumedLen: 0 };

    const body = src.slice(ocStart);

    const attachRe = /\boperator\s+attachment(?:s)?\s*:?/i;
    const attachIdx = body.search(attachRe);

    let rawEnd = (attachIdx !== -1) ? attachIdx : body.length;

    const OC_LABEL_RE = /^operator\s+comments?\s*[:\-–—]?\s*/i;
    const contentFull = body.slice(0, rawEnd);
    const content = contentFull.replace(OC_LABEL_RE, '');

    const esc = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const socUnion = (Array.isArray(socNames) ? socNames : [])
        .map(s => esc(String(s || '')))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .join('|');

    const GENERIC_SOC_TITLE = /(?:\*{3,}\s*)?[A-Z][A-Za-z0-9&()\/\s.\-]{2,80}:\s/;
    const SOC_BOUNDARY_RE = socUnion
        ? new RegExp(String.raw`(?:\*{3,}\s*)?(?:${socUnion})\s*:`, 'i')
        : GENERIC_SOC_TITLE;

    const IMMEDIATE_RE = /immediate\s*cause\s*[:\-–—]?\s*/i;
    const ROOT_RE = /root\s*cause(?:s|\(s\))?(?:\s*analysis)?\s*[:\-–—]?\s*/i;
    const CORR_RE = /(corrective|correction)\s*action\s*[:\-–—]?\s*/i;
    const PREV_RE = /prevent(?:ive|ative)\s*action\s*[:\-–—]?\s*/i;

    const headers = [
        { key: 'immediateCause', re: IMMEDIATE_RE },
        { key: 'rootCause', re: ROOT_RE },
        { key: 'correctiveAction', re: CORR_RE },
        { key: 'preventativeAction', re: PREV_RE },
    ];

    const found = [];
    for (const h of headers) {
        const m = content.match(h.re);
        if (m) found.push({ key: h.key, index: m.index, len: m[0].length });
    }
    found.sort((a, b) => a.index - b.index);

    const oc = {
        name: '', date: '',
        immediateCause: '', rootCause: '',
        correctiveAction: '', preventativeAction: '',
        notes: ''
    };

    const firstHdrIdx = found.length ? found[0].index : content.length;
    if (firstHdrIdx > 0) {
        const between = content.slice(0, firstHdrIdx).trim();
        const DATE_RE = /\b(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/;
        const DATE_THEN_BY = new RegExp(DATE_RE.source + String.raw`\s+(?:uploaded\s+)?by\s+(.+)$`, 'i');
        const BY_THEN_DATE = new RegExp(String.raw`^(?:uploaded\s+)?by\s+(.+?)\s+(?:on\s+)?` + DATE_RE.source + `$`, 'i');

        let m = between.match(DATE_THEN_BY);
        if (m) { oc.date = (m[1] || '').trim(); oc.name = (m[2] || '').trim(); }
        else {
            m = between.match(BY_THEN_DATE);
            if (m) { oc.name = (m[1] || '').trim(); oc.date = (m[2] || '').trim(); }
            else {
                const dm = between.match(DATE_RE); if (dm) oc.date = (dm[1] || '').trim();
                const bl = between.match(/\b(?:uploaded\s+)?by\s+(.+)/i); if (bl) oc.name = (bl[1] || '').trim();
            }
        }
    }

    const takeSlice = (from, to) => content.slice(from, to).trim();

    if (found.length === 0) {
        oc.notes = content.trim();
    } else {
        const pre = content.slice(0, firstHdrIdx).trim();
        if (pre) oc.notes = pre;

        for (let i = 0; i < found.length; i++) {
            const cur = found[i];
            const start = cur.index + cur.len;
            let end = (i + 1 < found.length) ? found[i + 1].index : content.length;
            let val = takeSlice(start, end);

            if (found[i].key === 'preventativeAction') {
                const m = val.match(SOC_BOUNDARY_RE);
                if (m && m.index > -1) {
                    val = val.slice(0, m.index).trim();
                    const globalCut = (contentFull.length - content.length) + start + m.index;
                    rawEnd = Math.min(rawEnd, globalCut);
                }
            }

            if (val) oc[cur.key] = val;
        }
    }

    const tail = (attachIdx !== -1) ? body.slice(attachIdx, attachIdx + 400) : '';
    if (!oc.date || !oc.name) {
        const scan = content + ' ' + tail;
        const DATE_RE = /\b(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2})\b/;
        const DATE_THEN_BY_RE = new RegExp(String.raw`${DATE_RE.source}\s+(?:uploaded\s+)?by\s+([^|,\n\r.]+)`, 'i');
        const BY_THEN_DATE_RE = new RegExp(String.raw`(?:uploaded\s+)?by\s+([^|,\n\r.]+?)\s+(?:on\s+)?${DATE_RE.source}`, 'i');
        let m1 = scan.match(DATE_THEN_BY_RE);
        if (m1) { if (!oc.date) oc.date = m1[1].trim(); if (!oc.name) oc.name = m1[2].trim(); }
        else {
            let m2 = scan.match(BY_THEN_DATE_RE);
            if (m2) { if (!oc.name) oc.name = m2[1].trim(); if (!oc.date) oc.date = m2[2].trim(); }
        }
    }

    const consumedLen = ocStart + rawEnd;
    return { oc, consumedLen };
}

function extractStandardCategoryNegatives(filterQuestion, category, nocGrouped, negativeObsertions) {
    const result = [];
    const baseNegatives = negativeObsertions[category] || [];
    const validNocs = nocGrouped[category] || [];
    const socSet = new Set((typeof socs !== 'undefined' ? socs : []).map(s => s.description.toLowerCase().trim()));

    const OP_HDR_RE = /^operator\s+comments\b/i;
    const OP_ATTACH_RE = /^operator\s+attachments?:?/i;
    const PREV_RE = /^prevent(?:ive|ative)\s*action\b/i;

    let inSection = false;
    let sectionLines = [];
    let ocGuard = false;
    
    // Track the type of the current section (e.g., 'hardware', 'process', 'human')
    let currentSectionType = null; 

    for (let i = 0; i <= filterQuestion.length; i++) {
        const raw = filterQuestion[i]?.data || filterQuestion[i]?.imagename || "";
        const line = raw.trim();
        const lower = line.toLowerCase();

        // 1. Identify which Header started this section
        let detectedType = null;
        if (lower.startsWith(category.toLowerCase())) detectedType = category.toLowerCase();
        else if (lower.startsWith('hardware')) detectedType = 'hardware';
        else if (lower.startsWith('process')) detectedType = 'process';
        else if (lower.startsWith('human')) detectedType = 'human';
        else if (lower.startsWith('photograph')) detectedType = 'photograph';

        // 2. Determine Section Start
        const isSectionStartRaw = detectedType !== null;
        const isSectionStart = inSection ? (!ocGuard && isSectionStartRaw) : isSectionStartRaw;

        if (isSectionStart || i === filterQuestion.length) {
            
            // --- PROCESS PREVIOUS SECTION ---
            if (inSection && sectionLines.length > 0) {
                // CRITICAL FIX: Only process this section if its type matches the requested Category
                // This prevents "Hardware" calls from picking up "Process" lines.
                if (currentSectionType === category.toLowerCase()) {
                    
                    const sectionText = sectionLines.join(' ').replace(/\s+/g, ' ').trim();

                    // SKIP HUMAN SECTIONS (As per previous request)
                    if (!/^human\b/i.test(sectionText)) {

                        baseNegatives.forEach((response) => {
                            const resLower = response.toLowerCase();
                            if (!sectionText.toLowerCase().includes(resLower)) return;

                            const beforeCount = result.length;
                            let baseText = sectionText;

                            // Remove Headers
                            baseText = baseText.replace(
                                /^\s*(?:(?:Process|Hardware|Hull|Photograph)(?:\s+Rating)?\b\s*[:\-–—]?\s*)+/i, 
                                ''
                            );

                            // Remove Response
                            const resIdx = baseText.toLowerCase().indexOf(response.toLowerCase());
                            if (resIdx > -1) {
                                baseText = baseText.slice(resIdx + response.length);
                            }

                            // Cleanup
                            baseText = baseText.replace(/^[\s.:\-–—]+/, "");
                            baseText = baseText.replace(
                                /^\s*(?:(?:Process|Hardware|Hull|Photograph)(?:\s+Rating)?\b\s*[:\-–—]?\s*)+/i, 
                                ''
                            );
                            baseText = baseText.replace(/^[\s.:\-–—]+/, "");

                            const fallbackBaseText = baseText;
                            let originalText = baseText;

                            while (true) {
                                let bestMatch = null;

                                validNocs.forEach(noc => {
                                    const nocEsc = noc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                    const pattern = new RegExp(`(?:^|[\\s])((?:[a-z0-9\\s&\\-\\/().,]*):\\s*)?(${nocEsc})(?![a-z0-9])`, 'i');

                                    const m = pattern.exec(originalText);

                                    if (m) {
                                        const fullMatch = m[0];
                                        const prefixOffset = fullMatch.match(/^\s/) ? 1 : 0;
                                        const matchStart = m.index + prefixOffset;
                                        const matchLen = fullMatch.length - prefixOffset;

                                        const textBefore = originalText.slice(0, matchStart);
                                        const isQuestionLabel = /[\d]+\.\s*$/.test(textBefore);

                                        if (!isQuestionLabel) {
                                            if (bestMatch === null || matchStart < bestMatch.start || (matchStart === bestMatch.start && matchLen > bestMatch.length)) {
                                                bestMatch = {
                                                    start: matchStart,
                                                    length: matchLen,
                                                    socRaw: m[1] ? m[1].trim().replace(/:$/, '') : null,
                                                    noc: noc,
                                                    fullMatchText: m[2]
                                                };
                                            }
                                        }
                                    }
                                });

                                if (!bestMatch) break;

                                const nocAbsIdx = bestMatch.start + bestMatch.length;
                                const afterNoc = originalText.slice(nocAbsIdx);
                                
                                let cutOffIndex = afterNoc.length;
                                const ocIdx = afterNoc.toLowerCase().indexOf('operator comments');
                                if (ocIdx !== -1) cutOffIndex = ocIdx;

                                baseNegatives.forEach(neg => {
                                    const negIdx = afterNoc.toLowerCase().indexOf(neg.toLowerCase());
                                    if (negIdx !== -1 && negIdx < cutOffIndex) {
                                        if (negIdx > 5) cutOffIndex = negIdx;
                                    }
                                });

                                validNocs.forEach(noc => {
                                    if(noc === bestMatch.noc && afterNoc.trim().startsWith(noc)) return;

                                    const nocEsc = noc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                    const pattern = new RegExp(`(?:^|[\\s])((?:[a-zA-Z0-9\\s&,]*):\\s*)?(${nocEsc})`, 'i');
                                    
                                    const m = pattern.exec(afterNoc);
                                    if (m) {
                                        const matchStart = m.index + (m[0].match(/^\s/) ? 1 : 0);

                                        if (matchStart < cutOffIndex && matchStart > 5) {
                                            cutOffIndex = matchStart;
                                        }
                                    }
                                });

                                if (ocIdx === -1) {
                                    const nextQuestionMatch = afterNoc.match(/\s(?:\d{1,2}|\d+(?:\.\d+)+)(?:\.| -)\s+[A-Z]/);         
                                    if (nextQuestionMatch && nextQuestionMatch.index < cutOffIndex) {
                                        cutOffIndex = nextQuestionMatch.index;
                                    }
                                }

                                let rawRemark = afterNoc.slice(0, cutOffIndex).trim();
                                rawRemark = rawRemark.replace(/\s\d{1,2}\.?\s*$/, "").trim();

                                const imageRegex = /\b[\w-]+\.jpe?g\b/gi;
                                const images = rawRemark.match(imageRegex) || [];
                                const cleanRemark = rawRemark.replace(imageRegex, "").trim();

                                let operatorComments = [];
                                let ocConsumedLen = 0;
                                if (ocIdx !== -1 && cutOffIndex === ocIdx) {
                                    const socNames = (typeof socs !== 'undefined' ? socs : []).map(s => s.description);
                                    const { oc, consumedLen } = parseOperatorCommentsFromText(
                                        afterNoc.slice(ocIdx),
                                        socNames,
                                        validNocs
                                    );
                                    if (oc) operatorComments.push(oc);
                                    ocConsumedLen = consumedLen;
                                }

                                let matchedSoc = null;
                                if (bestMatch.socRaw && socSet.has(bestMatch.socRaw.toLowerCase())) {
                                    const originalSoc = (socs || []).find(s => s.description.toLowerCase() === bestMatch.socRaw.toLowerCase());
                                    matchedSoc = originalSoc ? originalSoc.description : bestMatch.socRaw;
                                } else {
                                    const fallback = (socs || [])
                                        .filter(s => originalText.toLowerCase().includes(s.description.toLowerCase()));
                                    if (fallback.length > 0) matchedSoc = "N/A";
                                }

                                result.push({
                                    negative: response,
                                    soc: matchedSoc,
                                    noc: bestMatch.noc,
                                    remark: cleanRemark || null,
                                    images: images,
                                    operatorComments: operatorComments || null
                                });

                                if (ocIdx !== -1 && cutOffIndex === ocIdx) {
                                    originalText = afterNoc.slice(ocIdx + ocConsumedLen);
                                } else {
                                    originalText = afterNoc.slice(cutOffIndex);
                                }
                            }

                            if (result.length === beforeCount) {
                                let fallbackRemark = fallbackBaseText;
                                const ocIdx = fallbackRemark.toLowerCase().indexOf('operator comments');
                                if (ocIdx !== -1) fallbackRemark = fallbackRemark.slice(0, ocIdx);
                                
                                const nextQuestionMatch = fallbackRemark.match(/\s\d+\.\s+[A-Z]/);
                                if (nextQuestionMatch) fallbackRemark = fallbackRemark.slice(0, nextQuestionMatch.index);

                                fallbackRemark = fallbackRemark.replace(/\b[\w-]+\.jpe?g\b/gi, "").trim();

                                result.push({
                                    negative: response,
                                    remark: fallbackRemark || null
                                });
                            }
                        });
                    }
                }
            }

            // --- START NEW SECTION ---
            // Set the type for the section we are about to collect
            inSection = isSectionStartRaw;
            currentSectionType = detectedType; // Save 'hardware', 'process', etc.
            
            sectionLines = inSection ? [line] : [];
            ocGuard = false; 
        } else if (inSection) {
            if (OP_HDR_RE.test(line)) ocGuard = true;        
            if (PREV_RE.test(line)) ocGuard = false;       
            if (OP_ATTACH_RE.test(line)) ocGuard = false;    
            sectionLines.push(line);
        }
    }

    return result;
}


function extractValidHumanNegatives(filterQuestion, nocGrouped, negativeObsertions) {
    const result = [];
    const HUMAN = 'Human';
    const humanNocs = nocGrouped?.[HUMAN] ?? [];
    const humanNegs = negativeObsertions?.[HUMAN] ?? [];

    // Build a fast negative matcher for headers
    const negativePattern =
        humanNegs.length
            ? new RegExp(humanNegs.map(n => escapeRegExp(n)).join('|'), 'i')
            : null;

    const isHumanHeaderStrict = (line) => {
        const t = CLEAN(line);
        if (!/^human\b/i.test(t)) return false;
        if (/^human\s+error\b/i.test(t)) return false; // guard for "Human error ..."
        const body = t.replace(/^human\s*/i, '');
        const hasColon = body.includes(':');
        const hasKnownNegative = negativePattern ? negativePattern.test(body) : false;
        return hasColon || hasKnownNegative;
    };

    const isOpHdr = line => /^operator\s+comments?:?/i.test(CLEAN(line));
    const isOpAttachH = line => /^operator\s+attachments?:?/i.test(CLEAN(line)); // header-style
    const OP_ATTACH_INLINE_RE = /operator\s+attachments?:?/i;                    // inline marker

    // "Hardware" & "Process" exact-case; "human"/"photograph" case-insensitive
    const isSection = line => (
        /^(Hardware|Process)\b/.test(CLEAN(line)) ||
        /^(human|photograph)\b/i.test(CLEAN(line))
    );

    const nocRegexesStrict = humanNocs.map(noc =>
        new RegExp(
            `^\\s*(?:\\d+\\.?\\s*|[\\u2022*-]\\s*)?${escapeRegExp(noc)}\\s*[.;:!?']?\\s*$`,
            'i'
        )
    );
    const matchNocStrict = (line) => {
        const t = CLEAN(line);
        for (let i = 0; i < humanNocs.length; i++) {
            if (nocRegexesStrict[i].test(t)) return { matched: true, text: humanNocs[i] };
        }
        return { matched: false, text: '' };
    };

    // Parse a single Operator Comments block (no header line)
    function parseOC(lines) {
        const IMMEDIATE = /^(?:\d+[.)-]|\u2022|\*|-)?\s*immediate\s*cause\s*[:\-]?\s*(.*)$/i;
        const ROOT = /^(?:\d+[.)-]|\u2022|\*|-)?\s*root\s*cause(?:s|\(s\))?(?:\s*analysis)?\s*[:\-]?\s*(.*)$/i;
        const CORR = /^(?:\d+[.)-]|\u2022|\*|-)?\s*(corrective|correction)\s*action\s*[:\-]?\s*(.*)$/i;
        const PREV = /^(?:\d+[.)-]|\u2022|\*|-)?\s*prevent(?:ive|ative)\s*action\s*[:\-]?\s*(.*)$/i;
        const BULLET = /^(?:\d+[.)-]|\u2022|\*|-)\s+(.*)$/;
        const AUTHOR = /(\d{2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2})\s+by\s+(.+)/i;

        const oc = {
            name: '', date: '',
            immediateCause: '',
            rootCause: '', rootCauseItems: [],
            correctiveAction: '',
            preventativeAction: '',
            notes: ''
        };
        let field = '', buf = '';

        const commit = () => {
            const v = CLEAN(buf);
            if (!field || !v) { field = ''; buf = ''; return; }
            if (field === 'rootCause') {
                oc.rootCauseItems.push(v);
                oc.rootCause = oc.rootCauseItems.join('\n- ');
            } else {
                oc[field] = oc[field] ? (oc[field] + ' ' + v) : v;
            }
            field = ''; buf = '';
        };

        for (const raw of lines) {
            const line = CLEAN(raw); if (!line) continue;

            const a = line.match(AUTHOR);
            if (a) { oc.date = a[1]; oc.name = a[2]; continue; }

            let m;
            if ((m = line.match(IMMEDIATE))) { commit(); field = 'immediateCause'; buf = CLEAN(m[1]); continue; }
            if ((m = line.match(ROOT))) {
                commit();
                const t = CLEAN(m[1]);
                if (t) { oc.rootCauseItems.push(t); oc.rootCause = oc.rootCauseItems.join('\n- '); field = ''; buf = ''; }
                else { field = 'rootCause'; buf = ''; }
                continue;
            }
            if ((m = line.match(CORR))) { commit(); field = 'correctiveAction'; buf = CLEAN(m[2]); continue; }
            if ((m = line.match(PREV))) { commit(); field = 'preventativeAction'; buf = CLEAN(m[1]); continue; }

            if (field === 'rootCause') {
                const b = line.match(BULLET);
                if (b) {
                    if (CLEAN(buf)) { oc.rootCauseItems.push(CLEAN(buf)); buf = ''; }
                    oc.rootCauseItems.push(b[1]);
                    oc.rootCause = oc.rootCauseItems.join('\n- ');
                    continue;
                }
            }

            if (field) buf += (buf ? ' ' : '') + line;
            else oc.notes = oc.notes ? (oc.notes + ' ' + line) : line;
        }

        commit();
        if (oc.rootCauseItems.length && !oc.rootCause) oc.rootCause = oc.rootCauseItems.join('\n- ');
        return oc;
    }

    for (let i = 0; i < filterQuestion.length; i++) {
        const header = CLEAN(filterQuestion[i].data);
        if (!isHumanHeaderStrict(header)) continue;

        // Derive SOC + Negative from Human header line
        let soc = '', negative = '';
        const content = header.replace(/^Human\s*/i, '').replace(/\(.*?\)/g, '').trim();

        if (content.includes(':')) {
            const [sPart, nPart] = content.split(':').map(CLEAN);
            soc = sPart;
            const cleaned = nPart.replace(/\(.*?\)/g, '').trim();
            const hit = humanNegs.find(n => cleaned.toLowerCase().includes(n.toLowerCase()));
            if (hit) negative = hit;
        } else if (negativePattern && negativePattern.test(content)) {
            const hit = humanNegs.find(n => content.toLowerCase().includes(n.toLowerCase()));
            if (hit) {
                negative = hit;
                const idx = content.toLowerCase().indexOf(hit.toLowerCase());
                soc = (idx >= 0 ? content.slice(0, idx) : content).trim();
            }
        }
        if (!negative) continue;

        // Collect lines for this Human block (STOP only at a **strict** Human header)
        const raw = [];
        let j = i + 1;
        for (; j < filterQuestion.length; j++) {
            const txt = CLEAN(filterQuestion[j].data);
            if (isHumanHeaderStrict(txt)) break;   // avoid "Human error..." false header
            raw.push({ text: txt, idx: j });
        }

        // Streaming classification with OC gating
        const block = []; // { text, type: 'op'|'op_content'|'noc'|'other', idx, nocText? }
        let inOC = false;
        let ocStart = -1;
        let ocLines = [];
        const ocBlocks = []; // { start, end, lines }

        const PREV_HDR_RE = /^(?:\d+[.)-]|\u2022|\*|-)?\s*prevent(?:ive|ative)\s*action\s*[:\-]?\s*(?:\S.*)?$/i;

        // NOC checks are disabled inside OC until we see "Preventative Action" **or** "Operator Attachments"
        let nocChecksEnabledInsideOC = false;

        const endOC = (endIdxExclusive) => {
            if (inOC) {
                ocBlocks.push({ start: ocStart, end: endIdxExclusive, lines: ocLines.slice() });
                inOC = false; ocStart = -1; ocLines = [];
                nocChecksEnabledInsideOC = false;
            }
        };

        for (let r = 0; r < raw.length; r++) {
            let t = raw[r].text;

            if (isOpHdr(t)) {
                endOC(r);
                inOC = true; ocStart = r; ocLines = [];
                nocChecksEnabledInsideOC = false;        // Start OC with NOC checks OFF
                block.push({ ...raw[r], type: 'op' });
                continue;
            }

            if (inOC) {
                // 1) If a PREV header appears, allow subsequent NOC/section boundaries.
                if (PREV_HDR_RE.test(CLEAN(t))) {
                    nocChecksEnabledInsideOC = true;
                }

                // 2) Inline "Operator Attachments" handling:
                //    If present ANYWHERE in the line, split the line:
                //    - left side stays in OC content
                //    - OC ends immediately
                //    - right side (starting at "Operator Attachments") is reprocessed OUTSIDE OC
                const attachIdx = t.search(OP_ATTACH_INLINE_RE);
                if (attachIdx !== -1) {
                    const left = CLEAN(t.slice(0, attachIdx));
                    const right = CLEAN(t.slice(attachIdx)); // begins with "Operator Attachments..."

                    if (left) {
                        ocLines.push(left);
                        block.push({ ...raw[r], text: left, type: 'op_content' });
                    }

                    // End OC **now** (attachments must not bleed into Preventative Action)
                    endOC(r + 1); // we consumed the current line

                    if (right) {
                        // Reprocess the "Operator Attachments..." part outside OC on the next iteration
                        raw[r].text = right;
                        r--; // so the for-loop processes it again as outside-OC text
                    }
                    continue;
                }

                if (nocChecksEnabledInsideOC) {
                    const nm = matchNocStrict(t).matched;
                    if (nm) {
                        endOC(r);   // end OC before this line so it becomes a true NOC
                        r--;        // reprocess outside OC
                        continue;
                    }
                    if (isSection(t)) {
                        endOC(r);
                        r--;
                        continue;
                    }
                }

                // Otherwise, always accumulate OC content
                ocLines.push(t);
                block.push({ ...raw[r], type: 'op_content' });
                continue;
            }

            // Outside OC → classify strictly
            const nm = matchNocStrict(t);
            if (nm.matched) block.push({ ...raw[r], type: 'noc', nocText: nm.text });
            else block.push({ ...raw[r], type: 'other' });
        }
        endOC(raw.length); // tail flush

        // Leading remark (before FIRST NOC or OC header)
        const remarkLines = [];
        for (const it of block) {
            if (it.type === 'noc' || it.type === 'op') break;
            if (it.text) remarkLines.push(it.text);
        }
        const leadingRemark = remarkLines.join(' ').trim();

        // Attach parsed OC blocks to the preceding NOC (until next NOC)
        const nocPos = [];
        block.forEach((it, idx) => { if (it.type === 'noc') nocPos.push(idx); });

        for (let p = 0; p < nocPos.length; p++) {
            const thisPos = nocPos[p];
            const nextPos = (p + 1 < nocPos.length) ? nocPos[p + 1] : block.length;

            const operatorComments = [];
            for (const oc of ocBlocks) {
                if (oc.start > thisPos && oc.start < nextPos) {
                    operatorComments.push(parseOC(oc.lines));
                }
            }

            result.push({
                soc,
                negative,
                remark: leadingRemark,
                noc: block[thisPos].nocText,
                operatorComments
            });
        }

        // jump to the next Human block
        i = Math.max(i, j - 1);
    }

    return result;
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
            negative: "Photo not representative.",
            soc: socPart,
            noc: matchedNoc,
            remark: remarkLines.join(' ').trim()
        });
    }

    return result;
}

const exportToExcel = async (req, res) => {
    const { questions, vesselName, inspectionDate } = req.body;

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

        const hardwareList = [
            ...(Array.isArray(item.hardwareNegatives) ? item.hardwareNegatives : []),
            ...(Array.isArray(item.hardwareLargely) ? item.hardwareLargely : [])
        ];

        const processList = [
            ...(Array.isArray(item.processNegatives) ? item.processNegatives : []),
            ...(Array.isArray(item.processLargely) ? item.processLargely : [])
        ];

        const humanList = [
            ...(Array.isArray(item.humanNegatives) ? item.humanNegatives : []),
            ...(Array.isArray(item.humanLargely) ? item.humanLargely : [])
        ];

        const photoList = [
            ...(Array.isArray(item.photoNegatives) ? item.photoNegatives : []),
            ...(Array.isArray(item.photoLargely) ? item.photoLargely : [])
        ];
        // const hardwareList = Array.isArray(item.hardwareNegatives) ? item.hardwareNegatives : [];
        // const processList = Array.isArray(item.processNegatives) ? item.processNegatives : [];
        // const humanList = Array.isArray(item.humanNegatives) ? item.humanNegatives : [];
        // const photoList = Array.isArray(item.photoNegatives) ? item.photoNegatives : [];

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
    const createCategoryWorksheet = (workbook, categoryName, negativeKey, largelyKey, questions) => {
        const worksheet = workbook.addWorksheet(categoryName);

        const headerRow = [
            "VIQ NO.",
            "Question",
            "Tag",
            "Inspector Remark",
            "Observation Type",
            `${categoryName} Response`,
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
            { width: 18 }, // Observation Type
            { width: 20 }, // Negative Response
            { width: 15 }, // SOC
            { width: 15 }, // NOC
            { width: 20 }  // Severity Score
        ];

        let hasData = false;

        // Add data rows - only for questions that have data for this specific category
        for (const item of questions) {

            const negativeList = Array.isArray(item[negativeKey]) ? item[negativeKey] : [];
            const largelyList = Array.isArray(item[largelyKey]) ? item[largelyKey] : [];

            const categoryList = [
                ...negativeList.map(e => ({ ...e, type: 'Negative' })),
                ...largelyList.map(e => ({ ...e, type: 'Largely' }))
            ];
            // const categoryList = Array.isArray(item[categoryKey]) ? item[categoryKey] : [];

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
                        entry.type,
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

    createCategoryWorksheet(workbook, 'Hardware', 'hardwareNegatives', 'hardwareLargely', questions);
    createCategoryWorksheet(workbook, 'Process', 'processNegatives', 'processLargely', questions);
    createCategoryWorksheet(workbook, 'Human', 'humanNegatives', 'humanLargely', questions);
    createCategoryWorksheet(workbook, 'Photo', 'photoNegatives', 'photoLargely', questions);

    // createCategoryWorksheet(workbook, 'Hardware', 'hardwareNegatives', questions);
    // createCategoryWorksheet(workbook, 'Process', 'processNegatives', questions);
    // createCategoryWorksheet(workbook, 'Human', 'humanNegatives', questions);
    // createCategoryWorksheet(workbook, 'Photo', 'photoNegatives', questions);

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

module.exports = {
    convertToExcel,
    exportToExcel
}