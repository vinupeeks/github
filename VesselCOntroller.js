const { where } = require('sequelize')
const db = require('../models')
const VesselInspection = db.vesselInspections
const InspectionQuestions = db.inspectionQuestions
const InspectionAllQuestions = db.inspectionAllQuestions;
const InspectionScore = db.inspectionScore
const Vessel = db.vessels
const Fleet = db.fleets
const Superintendent = db.superintendents
const User = db.users
const Op = db.Sequelize.Op
const CrewPositions = db.crewPossitions;
const ExcelJS = require('exceljs');

const getVessel = async (req, res) => {
    try {

        const { search } = req.query

        const searchByName = search ? { name: {[Op.like]: `%${search}%`} } : {}

        const user = await User.findOne({where: {id: req.user.id}, attributes: ['vessel_count', 'subscription']})

        const vessels = await Vessel.findAll({
            where: {
                [Op.and]: [{status: "active"}, {user_id: req.user.id}],
                ...searchByName
            },
            include: [
                {
                    model: Fleet,
                    where: {
                        status: "active"
                    },
                    required: true
                },
                {
                    model: Superintendent,
                    where: {
                        status: "active"
                    },
                    required: true
                }
            ],
            order: [['id', 'DESC']]
        });

        if (!vessels || vessels.length === 0) {
            return res.status(404).json({
                message: "No vessels found",
                success: false,
                isVesselAdding: user.vessel_count - vessels.length > 0
            });
        }

        res.status(200).json({
            message: "success",
            success: true,
            data: vessels,
            isPremium: user.subscription === "Premium",
            isVesselAdding: user.vessel_count - vessels.length > 0
        });

    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message
        });
    }
}

const createVessel = async (req, res) => {
    try {

        const { name, fleet_id, super_id } = req.body;

        if (!name || !fleet_id || !super_id) {
            return res.status(400).json({
                message: "Name, Fleet ID, and Superintendent ID are required",
                success: false
            });
        }

        const vesselExists = await Vessel.findOne({
            where: {
                name,
                created_by: req.user.id
            }
        });

        if (vesselExists) {
            return res.status(400).json({
                message: "Vessel with this name already exists",
                success: false
            });
        }

        const newVessel = await Vessel.create({
            name,
            fleet_id,
            super_id,
            user_id: req.user.id,
            status: "active",
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.status(201).json({
            message: "Vessel created successfully",
            success: true,
            data: newVessel
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

const updateVessel = async (req, res) => {
    try {
        const { id } = req.params;

        const { name, fleet_id, super_id } = req.body;

        if (!name || !fleet_id || !super_id) {
            return res.status(400).json({
                message: "Name, Fleet ID, and Superintendent ID are required",
                success: false
            });
        }

        const vesselExists = await Vessel.findOne({
            where: {
                [Op.and]: [
                    { id: { [Op.ne]: id } },
                    { created_by: req.user.id },
                    { name: name }
                ]
            }
        });

        if (vesselExists) {
            return res.status(400).json({
                message: "Vessel with this name already exists",
                success: false
            });
        }

        const vessel = await Vessel.findByPk(id);
        
        if (!vessel) {
            return res.status(404).json({
                message: "Vessel not found",
                success: false
            });
        }

        const updatedVessel = await vessel.update({
            name,
            fleet_id,
            super_id,
            updated_by: req.user.id
        });

        res.status(200).json({
            message: "Vessel updated successfully",
            success: true,
            data: updatedVessel
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

const getInspections = async (req, res) => {
    try{
        
        const user_id = Number((req.user.role_id === 1 && req.query.user_id) ? req.query.user_id : req.user.id)

        const user = await User.findByPk(user_id, {
            attributes: ['id', 'email', 'role_id', 'subscription', 'last_subscription_date', 'status']
        })

        const { search } = req.query

        const searchByName = search ? { name: {[Op.like]: `%${search}%`} } : {}

        const vesselDetails = await Vessel.findAll({
            where: {
                [Op.and]: [{user_id}, {status: "active"}, searchByName]
            },
            order: [['id', 'DESC']]
        });

        const result = (await Promise.all(vesselDetails.map(async vessel => {

            const countOfInspectionByVessel = await VesselInspection.count({
                where: {
                    vessel_id: vessel.id,
                    status: {[Op.ne]: "deleted"}
                }
            });

            if(countOfInspectionByVessel === 0){
                return null;
            }

            const lastInspection = await VesselInspection.findOne({
                where: {
                    vessel_id: vessel.id,
                    status: "active"
                },
                order: [['report_date', 'DESC']],
                include: [
                    {
                        model: InspectionQuestions,
                        include: [InspectionScore]
                    }
                ]
            });

            if(!lastInspection){
                return null;
            }

            let coreScore = 0;
            let rotationalScore = 0;
            let scoring = [];

            for(const question of lastInspection.inspection_questions || []){

                const tag = question.tag;
                const scores = question.inspection_scores || [];

                const questionScore = scores.reduce((sum, entry) => sum + (entry.score || 0), 0);

                scores.forEach(entry => {
                    if (entry.isNegative === "yes") {
                        scoring.push(entry.score);
                    }
                });

                if (tag === "Core") {
                    coreScore += questionScore;
                } else if (tag === "Rotational 1" || tag === "Rotational 2") {
                    rotationalScore += questionScore;
                }
            }

            const isManualScore = scoring.some(score => score == null);

            return {
                id: lastInspection.id,
                vessel_id: vessel.id,
                vesselName: vessel?.name || "Unknown Vessel",
                countOfInspectionByVessel,
                isManualScore,
                coreScore,
                rotationalScore,
                totalScore: coreScore + rotationalScore,
                super_id: lastInspection.super_id,
                status: lastInspection.status,
                createdOn: lastInspection.createdAt,
                inspectionDate: lastInspection.report_date,
                filename: lastInspection.report_name
            };
        }))).filter(Boolean);

        res.status(200).json({
            message: "success",
            sucess: true,
            data: result,
            user: user
        })
        
    }catch(err){
        console.log(err)
        res.status(500).json({
            message: err.message
        })
    }
}

const getInspectionsByVessel = async (req, res) => {
    try {

        const { vessel_id } = req.params

        const vessel = await Vessel.findOne({
            where: {
                [Op.and]: [{id: vessel_id}]
            },
            order: [['id', 'DESC']]
        });


        if (!vessel) {
            return res.status(404).json({
                message: "No active vessel found for this user.",
                success: false
            });
        }

        const inspections = await VesselInspection.findAll({
            where: {
                vessel_id: vessel.id,
                status: {[Op.ne]: "deleted"}
            },
            order: [['report_date', 'DESC']],
            include: [
                {
                    model: InspectionQuestions,
                    include: [InspectionScore]
                }
            ]
        });

        if (!inspections.length) {
            return res.status(200).json({
                message: "No inspections found for this vessel.",
                success: true,
                data: []
            });
        }

        const result = inspections.map(inspection => {
            let coreScore = 0;
            let rotationalScore = 0;
            let scoring = [];

            for (const question of inspection.inspection_questions || []) {
                const tag = question.tag;
                const scores = question.inspection_scores || [];

                const questionScore = scores.reduce((sum, entry) => sum + (entry.score || 0), 0);

                scores.forEach(entry => {
                    if (entry.isNegative === "yes") {
                        scoring.push(entry.score);
                    }
                });

                if (tag === "Core") {
                    coreScore += questionScore;
                } else if (tag === "Rotational 1" || tag === "Rotational 2") {
                    rotationalScore += questionScore;
                }
            }

            const isManualScore = scoring.some(score => score == null);

            return {
                id: inspection.id,
                vesselName: vessel?.name || "Unknown Vessel",
                vessel_id: vessel?.id,
                isManualScore,
                coreScore,
                rotationalScore,
                totalScore: coreScore + rotationalScore,
                super_id: inspection.super_id,
                status: inspection.status,
                createdOn: inspection.createdAt,
                inspectionDate: inspection.report_date,
                filename: inspection.report_name
            };
        });

        res.status(200).json({
            message: "success",
            success: true,
            data: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
};

const getViewInspection = async (req, res) => {
  try {
    const id = req.params.id;

    const [ inspection, vesselInspection ] = await Promise.all([
        InspectionQuestions.findAll({
            where: {
                [Op.and]: [{ status: "active" }, { inspection_id: id }]
            },
            include: [
                {
                    model: InspectionScore,
                        include: [
                            {
                                model: CrewPositions,
                            }
                        ]
                }
            ]
        }),
        VesselInspection.findOne({
            where: {
                id: id
            },
            attributes: ['cheif_engineer_name', 'inspector', 'master', 'company_name', 'port_name', 'country', 'vessel_sup_name' ],
            include:[Superintendent]
        })
    ]);

    if (!inspection || inspection.length === 0) {
      return res.status(404).json({
        message: "No inspection data found",
        success: false
      });
    }

    const data = inspection.map((item) => {
      const hardwareNegatives = [];
      const processNegatives = [];
      const humanNegatives = [];
      const humanPositives = [];
      const photoNegatives = [];

      for (const score of item.inspection_scores || []) {
        const scoreData = {
            id: score.id,
            negative: score.negative,
            noc: score.noc,
            soc: score.soc,
            remark: score.remark,
            score: score.score,
            isWrong: score.isWrong,
            human_name: score.human_name,
            crew_id: score.crew_id,
            risk: score.risk,
            statusData: score.statusData,
            crew_title: score.crew_position ? score.crew_position.title : null,
            operator_comments: score.operator_comments || null
        };

        const category = score.category?.toLowerCase();
        const isNeg = score.isNegative?.toUpperCase();

        if (category === "hardware" && isNeg === "YES") {
          hardwareNegatives.push(scoreData);
        } else if (category === "process" && isNeg === "YES") {
          processNegatives.push(scoreData);
        } else if (category === "human") {
          if (isNeg === "YES") humanNegatives.push(scoreData);
          else if (isNeg === "NO") humanPositives.push(scoreData);
        } else if (category === "photo") {
          photoNegatives.push(scoreData);
        }
      }

      return {
        id: item.id,
        question_no: item.viq,
        tag: item.tag,
        question: item.question,
        hardwareNegatives,
        processNegatives,
        humanNegatives,
        humanPositives,
        photoNegatives
      };
    });

    res.status(200).json({
      message: "success",
      success: true,
      vesselInspection,
      data
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message
    });
  }
};

const updateScore = async (req, res) => {
    try{

        const data = req.body || []

        for (const item of data) {
            if (item.id && typeof item.score === 'number') {
                await InspectionScore.update(
                    { score: item.score },
                    { where: { id: item.id } }
                );
            }
        }

        res.status(200).json({
            success: true,
            message: "Scores updated successfully"
        });

    }
    catch(err){
        console.log(err);
        res.status(500).json({
          message: err.message
        });
    }
}

const deleteInspection = async (req, res) => {
    try {
        const  {id}  = req.body;

        // Validate if ID is provided
        if (!id) {
            return res.status(400).json({
                message: "Inspection ID is required",
                success: false
            });
        }

        // Find the inspection first to check if it exists and belongs to the user
        const inspection = await VesselInspection.findOne({
            where: {
                id: id,
                user_id: req.user.id,
                status: { [Op.ne]: "deleted" }
            },
            include: [
                {
                    model: db.vessels,
                    as: 'vessel',
                    attributes: ['id', 'name',]
                },
                {
                    model: db.fleets,
                    as: 'fleet',
                    attributes: ['id', 'name',]
                },
                {
                    model: db.superintendents,
                    as: 'superintendent',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!inspection) {
            return res.status(404).json({
                message: "Inspection not found or already deleted",
                success: false
            });
        }

        // Update the status to "deleted"
        await VesselInspection.update(
            { 
                status: "deleted",
                updatedAt: new Date(),
                updated_by: req.user.id,
            },
            {
                where: {
                    id: id,
                    user_id: req.user.id
                }
            }
        );

        // Fetch the updated inspection with all related data
        const updatedInspection = await VesselInspection.findOne({
            where: {
                id: id,
                user_id: req.user.id
            },
            include: [
                {
                    model: db.vessels,
                    as: 'vessel',
                    attributes: ['id', 'name', 'status']
                },
                {
                    model: db.fleets,
                    as: 'fleet',
                    attributes: ['id', 'name', 'status']
                },
                {
                    model: db.superintendents,
                    as: 'superintendent',
                    attributes: ['id', 'name', 'status']
                }
            ]
        });

        res.status(200).json({
            message: "Inspection deleted successfully",
            success: true,
            data: updatedInspection
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
};

const editIsWrong = async (req, res) => {
  try {
    const { id, isWrong, human_name, crew_id, risk, statusData  } = req.body;     

    // Validate isWrong value
    // if (!["yes", "no"].includes(isWrong)) {
    //   return res.status(400).json({ message: "isWrong must be either 'yes' or 'no'" });
    // }

    const inspection = await InspectionScore.findByPk(id)

    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }

    const updateData = {
      isWrong: isWrong,
      human_name: human_name || null,
      crew_id: crew_id || null,
      risk: risk,
      statusData: statusData,
      updated_by: req.user.id
    };

    await InspectionScore.update(updateData, {
      where: { id }
    });

    const updatedData = await InspectionScore.findByPk(id, {
        attributes: ['id', 'question_id', 'human_name', 'crew_id', 'risk', 'statusData', 'isWrong', 'category', 'updated_by']
    });

    res.status(200).json({ 
      success: true,
      message: "InspectionScore updated successfully", 
      inspection: updatedData  
    });

  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ 
        success: false,
        message: "Failed to update inspection", 
        error: error.message });
  }
};

const updateInspectorName = async (req, res) => {
    try {
        const { id } = req.params;
        const { cheif_engineer_name, inspector, master, company_name, port_name, country, vessel_sup_name } = req.body;

        const inspection = await VesselInspection.findOne({
            where: {
                id: id,
                status: { [Op.ne]: 'deleted' }
            }
        });

        if (!inspection) {
            return res.status(404).json({
                message: "Vessel inspection not found",
                success: false
            });
        }

        inspection.cheif_engineer_name = cheif_engineer_name;
        inspection.inspector = inspector;
        inspection.master = master;
        inspection.company_name = company_name;
        inspection.port_name = port_name;
        inspection.country = country;
        inspection.vessel_sup_name = vessel_sup_name;
        inspection.updated_by = req.user.id;
        await inspection.save();

        return res.status(200).json({
            message: "Chief engineer name updated successfully",
            success: true,
            data: inspection
        });
    } catch (error) {
        console.error("Error updating chief engineer name:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error
        });
    }
}; 

const vesselAndVesselInspectionCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const totalVessels = await Vessel.findAll({
            where: {
                user_id: userId,
                status: { [Op.ne]: "deleted", },
            },
            attributes: ["id"],
        });
        const vesselIds = totalVessels.map(v => v.id);

        const inspectedVesselIds = await VesselInspection.findAll({
            where: {
                user_id: userId,
                status: { [Op.ne]: "deleted", },
                vessel_id: { [Op.in]: vesselIds },
            },
            attributes: ["vessel_id"],
            group: ["vessel_id"],
        });

        const activeVesselCount = inspectedVesselIds.length;

        // Count total active inspections
        const totalInspections = await VesselInspection.count({
            where: {
                user_id: userId,
                status: { [Op.ne]: "deleted" },
            },
        });

        res.status(200).json({
            message: "Total vessel and inspection counts retrieved successfully.",
            success: true,
            data: {
                totalVessels: activeVesselCount,
                totalInspections
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "An unexpected error occurred.", error: err.message });
    }
};

// const viqPredition = async (req, res) => {
//     const allViqsFromCache = req.app.locals.sireDataCache;
//     try {
//         const userId = req.user.id;
//         const { vessel_id } = req.body; 

//         if (!vessel_id) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Vessel ID is required in the request body." 
//             });
//         }
        
//         const inspectionData = await VesselInspection.findAll({
//             attributes: [ 'id', 'report_date' ],
//             where: {
//                 user_id: userId,
//                 vessel_id: vessel_id,
//                 status: { [Op.ne]: "deleted" },
//             },
//             include: [
//                 {
//                     model: InspectionAllQuestions,
//                     where: {
//                         tag: { [Op.ne]: "Core" },
//                     },
//                     attributes: [ 'viq', 'tag', ],
//                     required: true,
//                 },
//             ],
//             order: [
//                 ['report_date', 'DESC']
//             ]
//         });

//         if (inspectionData.length === 0) {
//             return res.status(200).json({ message: "No inspection data found for this vessel.",
//                 success: true, data: [], depots: []
//             });
//         }
        
//         // ✅ STEP 1: group VIQs with their dates and presence
//         const result = [];
//         const inspectionDates = inspectionData.map(i => i.report_date);
//         const sortedInspectionDates = [...inspectionDates].sort( (a, b) => new Date(a) - new Date(b));

//         const viqMap = {};
//         inspectionData.forEach(inspection => {
//             inspection.inspection_all_questions.forEach(q => {
//                 const normalizedViq = q.viq.replace(/\.$/, '');
//                 if (!viqMap[normalizedViq]) viqMap[normalizedViq] = [];
//                 viqMap[normalizedViq].push({
//                     date: inspection.report_date,
//                     present: "Yes",
//                     tag: q.tag,
//                 });
//             });
//         });

//         // Convert to your required structure
//         for (const viq in viqMap) {
//             const dates = sortedInspectionDates.map(date => ({
//                 date,
//                 present: viqMap[viq].some(d => d.date === date) ? "Yes" : "No",
//             }));
//             result.push({ viq, dates });
//         }

//         // ✅ STEP 2: prepare VIQ tags map (e.g., "R1", "R2")
//         const viqTags = {};
//         for (const viq in viqMap) {
//             const firstTag = viqMap[viq][0]?.tag || "Rotational 1";
//             if (firstTag.toLowerCase().includes("1")) {
//                 viqTags[viq] = "R1";
//             } else if (firstTag.toLowerCase().includes("2")) {
//                 viqTags[viq] = "R2";
//             } else {
//                 viqTags[viq] = "R1";
//             }
//         }

//         // ✅ STEP 3: CALL the prediction function here
//         const allExpectedViqs = allViqsFromCache.map(item => item.question_no);

//         const cacheTagMap = {};
//         allViqsFromCache.forEach(item => { cacheTagMap[item.question_no] = item.tag });

//         // Check which VIQs are missing from the result
//         const missingViqs = allExpectedViqs.filter(viq => !result.find(item => item.viq === viq) );

//         // Add missing VIQs with default "No" values
//         missingViqs.forEach(viq => {
//             const dates = sortedInspectionDates.map(date => ({ date, present: "No" }));
//             result.push({ viq, dates });
            
//             // Set tag for missing VIQs from cache
//             if (cacheTagMap[viq]) {
//                 const tag = cacheTagMap[viq];
//                 if (tag.toLowerCase().includes("1")) {
//                     viqTags[viq] = "R1";
//                 } else if (tag.toLowerCase().includes("2")) {
//                     viqTags[viq] = "R2";
//                 } else {
//                     viqTags[viq] = "R1";
//                 }
//             } else {
//                 viqTags[viq] = "R1";
//             }
//         });

//         // ✅ STEP 4: Now call the prediction function with complete data
//         const finalData = calculatePrediction(result, sortedInspectionDates, viqTags);

//         res.status(200).json({
//             message: "Vessel inspections and question data retrieved successfully.",
//             success: true,
//             data: finalData,
//         });

//     } catch (err) {
//         console.error("Error in viqPredition:", err);
//         res.status(500).json({ success: false, message: "An unexpected error occurred during data retrieval.", error: err.message });
//     }
// };

// function calculatePrediction(viqData, inspectionDates, viqTags) {
//     const cycleMap = { R1: 2, R2: 5 };

//   return viqData.map(item => {
//     const tag = viqTags[item.viq] || "R1";
//     const cycle = cycleMap[tag];
//     const presentDates = item?.dates
//       ?.filter(d => d.present === "Yes")
//       ?.map(d => new Date(d.date))
//       ?.sort((a, b) => a - b);

//     let prediction = 0;

//         // For VIQs that were present at least once
//         if (presentDates.length > 0 && inspectionDates.length > 1) {
//             try {
//                 const lastInspection = presentDates[presentDates.length - 1];
//                 const upcomingInspection = new Date(inspectionDates[inspectionDates.length - 1]);

//                 const lastInspectionStr = lastInspection.toISOString().split("T")[0];
//                 const upcomingInspectionStr = upcomingInspection.toISOString().split("T")[0];

//                 const lastIndex = inspectionDates.findIndex(d => d === lastInspectionStr);
//                 const upcomingIndex = inspectionDates.findIndex(d => d === upcomingInspectionStr);

//                 if (lastIndex !== -1 && upcomingIndex !== -1 && upcomingIndex >= lastIndex) {
//                     const gap = upcomingIndex - lastIndex;
                    
//                     if (gap >= 0) {
//                         const deviationFromIdeal = Math.abs(cycle - gap);
//                         prediction = Math.max(0, 100 - (deviationFromIdeal / cycle) * 100);
//                     }
//                 }
//             } catch (error) {
//                 console.error(`Error calculating prediction for VIQ ${item.viq}:`, error);
//                 prediction = 0;
//             }
//         }
//         else if (presentDates.length === 0 && inspectionDates.length > 0) {
//             const totalInspections = inspectionDates.length;
            
//             if (totalInspections >= cycle) {
//                 prediction = 100;
//             } else {
//                 prediction = (totalInspections / cycle) * 100;
//             }
//         }

//         return { ...item, prediction: `${prediction.toFixed(1)}%`, cycleType: tag };
//     });
// }

const viqPredition = async (req, res) => {
    const allViqsFromCache = req.app.locals.sireDataCache;
    try {
        const userId = req.user.id;
        const { vessel_id } = req.body; 

        if (!vessel_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Vessel ID is required in the request body." 
            });
        }
        
        const inspectionData = await VesselInspection.findAll({
            attributes: [ 'id', 'report_date' ],
            where: {
                user_id: userId,
                vessel_id: vessel_id,
                status: { [Op.ne]: "deleted" },
            },
            include: [
                {
                    model: InspectionAllQuestions,
                    where: {
                        tag: { [Op.ne]: "Core" },
                    },
                    attributes: [ 'viq', 'tag', ],
                    required: true,
                },
            ],
            order: [
                ['report_date', 'DESC']
            ]
        });

        if (inspectionData.length === 0) {
            return res.status(200).json({ message: "No inspection data found for this vessel.",
                success: true, data: [], depots: []
            });
        }
        
        // ✅ STEP 1: group VIQs with their dates and presence
        const result = [];
        const inspectionDates = inspectionData.map(i => i.report_date);
        const sortedInspectionDates = [...inspectionDates].sort( (a, b) => new Date(a) - new Date(b));

        const viqMap = {};
        inspectionData.forEach(inspection => {
            inspection.inspection_all_questions.forEach(q => {
                const normalizedViq = q.viq.replace(/\.$/, '');
                if (!viqMap[normalizedViq]) viqMap[normalizedViq] = [];
                viqMap[normalizedViq].push({
                    date: inspection.report_date,
                    present: "Yes",
                    tag: q.tag,
                });
            });
        });

        // Convert to your required structure
        for (const viq in viqMap) {
            const dates = sortedInspectionDates.map(date => ({
                date,
                present: viqMap[viq].some(d => d.date === date) ? "Yes" : "No",
            }));
            result.push({ viq, dates });
        }

        // ✅ STEP 2: prepare VIQ tags map (e.g., "R1", "R2")
        const viqTags = {};
        for (const viq in viqMap) {
            const firstTag = viqMap[viq][0]?.tag || "Rotational 1";
            if (firstTag.toLowerCase().includes("1")) {
                viqTags[viq] = "R1";
            } else if (firstTag.toLowerCase().includes("2")) {
                viqTags[viq] = "R2";
            } else {
                viqTags[viq] = "R1";
            }
        }

        // ✅ STEP 3: CALL the prediction function here
        const allExpectedViqs = allViqsFromCache.map(item => item.question_no);

        const cacheTagMap = {};
        allViqsFromCache.forEach(item => { cacheTagMap[item.question_no] = item.tag });

        // Check which VIQs are missing from the result
        const missingViqs = allExpectedViqs.filter(viq => !result.find(item => item.viq === viq) );

        // Add missing VIQs with default "No" values
        missingViqs.forEach(viq => {
            const dates = sortedInspectionDates.map(date => ({ date, present: "No" }));
            result.push({ viq, dates });
            
            // Set tag for missing VIQs from cache
            if (cacheTagMap[viq]) {
                const tag = cacheTagMap[viq];
                if (tag.toLowerCase().includes("1")) {
                    viqTags[viq] = "R1";
                } else if (tag.toLowerCase().includes("2")) {
                    viqTags[viq] = "R2";
                } else {
                    viqTags[viq] = "R1";
                }
            } else {
                viqTags[viq] = "R1";
            }
        });

        // ✅ STEP 4: Now call the prediction function with complete data
        const finalData = calculatePrediction(result, sortedInspectionDates, viqTags);

        res.status(200).json({
            message: "Vessel inspections and question data retrieved successfully.",
            success: true,
            data: finalData,
        });

    } catch (err) {
        console.error("Error in viqPredition:", err);
        res.status(500).json({ success: false, message: "An unexpected error occurred during data retrieval.", error: err.message });
    }
};
 
function calculatePrediction(viqData, inspectionDates, viqTags) {
    const cycleMap = { R1: 8, R2: 8 };
    const skipMap = { R1: 2, R2: 5 };

    return viqData.map(item => {
        const tag = viqTags[item.viq] || "R1";
        const totalCycle = cycleMap[tag];
        const skipCount = skipMap[tag];

        const presentDates = item?.dates?.filter(d => d.present === "Yes")?.map(d => d.date);

        let prediction = 0;
        let gap = 0;

        // ** CASE 1: VIQs that were present at least once **
        if (presentDates.length > 0 && inspectionDates.length > 0) {
            try {
                const lastPresentDate = presentDates[presentDates.length - 1];

                const lastPresentIndex = inspectionDates.findIndex(d => d === lastPresentDate);
                
                const latestOverallIndex = inspectionDates.length - 1;

                if (lastPresentIndex !== -1 && latestOverallIndex >= lastPresentIndex) {
                    gap = latestOverallIndex - lastPresentIndex;
                    
                    if (gap === 0) {
                        prediction = 0;
                    } else if (gap > 0 && gap <= skipCount) {
                        prediction = 0;
                    } else if (gap > skipCount && gap < totalCycle) {
                        const startIncreasingGap = skipCount + 1;
                        const increasingRange = totalCycle - startIncreasingGap;
                        const currentPosition = gap - startIncreasingGap;

                        const basePrediction = 20; 
                        const percentageIncreasePerStep = (100 - basePrediction) / increasingRange;
                        
                        prediction = basePrediction + (currentPosition * percentageIncreasePerStep);
                        
                    } else if (gap >= totalCycle) {
                        prediction = 100;
                    }
                } else {
                    prediction = 0; 
                }
            } catch (error) {
                console.error(`Error calculating prediction for VIQ ${item.viq}:`, error);
                prediction = 0;
            }
        }
        // ** CASE 2: VIQs that were *never* present in any inspection **
        else if (presentDates.length === 0 && inspectionDates.length > 0) {
            const totalInspections = inspectionDates.length;
            
            if (totalInspections >= totalCycle) {
                prediction = 100;
            } else if (totalInspections > skipCount) {
                const startIncreasingGap = skipCount + 1;
                const increasingRange = totalCycle - startIncreasingGap;
                const currentPosition = totalInspections - startIncreasingGap;

                const basePrediction = 20; 
                const percentageIncreasePerStep = (100 - basePrediction) / increasingRange;
                prediction = basePrediction + (currentPosition * percentageIncreasePerStep);

            } else {
                prediction = 0;
            }
        }

        return { ...item, prediction: `${Math.min(100, prediction).toFixed(1)}%`, cycleType: tag, gap: gap };
    });
}

const dataEntriesList = async (req, res) => {
    try {
        const userId = req.user.id;

        const inspections = await VesselInspection.findAll({
            where: {
                user_id: userId,
                status: 'active'
            },
            attributes: [
                'cheif_engineer_name',
                'inspector',
                'master',
                'vessel_sup_name'
            ],
            order: [['createdAt', 'DESC']]
        });

        if (!inspections || inspections.length === 0) {
            return res.status(404).json({ success: false, message: 'No active vessel inspection entries found for this user.' });
        }

        const cleanUniqueSorted = (arr) => {
            return Array.from(
                new Set(
                    arr
                        ?.map(item => item?.trim())
                        ?.filter(v => v && v !== '')
                )
            )?.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        };

        const groupedData = {
            inspectors: cleanUniqueSorted(inspections.map(i => i.inspector)),
            masters: cleanUniqueSorted(inspections.map(i => i.master)),
            chief_engineers: cleanUniqueSorted(inspections.map(i => i.cheif_engineer_name)),
            superintendents: cleanUniqueSorted(inspections.map(i => i.vessel_sup_name))
        };

        return res.status(200).json({
            success: true,
            message: 'Grouped vessel inspection data fetched successfully.',
            data: groupedData
        });

    } catch (error) {
        console.error('Error fetching vessel inspection entries:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching active vessel inspections.',
            error: error.message
        });
    }
};

const PREDICTION_COLORS = [
  { max: 20, color: 'FFFDF3F3', label: "01% - 19%" }, // Almost White Pink
  { max: 40, color: 'FFF9E0E0', label: "20% - 39%" }, // Light Rose
  { max: 60, color: 'FFF6C4C4', label: "40% - 59%" }, // Soft Pink
  { max: 80, color: 'FFF2A3A3', label: "60% - 79%" }, // Gentle Red
  { max: 90, color: 'FFE98E8E', label: "80% - 89%" }, // Medium Red
  { max: Infinity, color: 'FFEE8585', label: "90%+" }  // Mild Red (reduced intensity) 
];

// Helper function to get the ARGB color for a prediction percentage
const getPredictionColor = (predictionValue) => {
    for (const group of PREDICTION_COLORS) {
        if (predictionValue < group.max) {
            return group.color; 
        }
    }
    return 'FFFFFFFF'; // Default White
};
// ----------------------------------------------------

// const viqReportExport = async (req, res) => {
//     const allViqsFromCache = req.app.locals.sireDataCache;
    
//     // 💡 FIX: Declare key variables outside the try block to avoid "is not defined" errors
//     let inspectionData = [];
//     let sortedInspectionDates = [];
//     let result = [];
//     let viqTags = {};
//     let finalData = [];

//     try {
//         const userId = req.user.id;
//         const { vessel_id } = req.body; 
        
//         if (!vessel_id) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Vessel ID is required in the request body." 
//             });
//         }

//         // Replicating the data retrieval and processing logic:
//         // =========================================================
//         inspectionData = await VesselInspection.findAll({
//             attributes: [ 'id', 'report_date' ],
//             where: { user_id: userId, vessel_id: vessel_id, status: { [Op.ne]: "deleted" } },
//             include: [{
//                 model: InspectionAllQuestions,
//                 where: { tag: { [Op.ne]: "Core" } },
//                 attributes: [ 'viq', 'tag', ],
//                 required: true,
//             }],
//             order: [['report_date', 'DESC']]
//         });

//         if (inspectionData.length === 0) {
//             return res.status(200).json({ message: "No data to export for this vessel.", success: true });
//         }
        
//         const inspectionDates = inspectionData.map(i => i.report_date);
//         sortedInspectionDates = [...inspectionDates].sort( (a, b) => new Date(a) - new Date(b));
//         const viqMap = {};
        
//         inspectionData.forEach(inspection => {
//             inspection.inspection_all_questions.forEach(q => {
//                 const normalizedViq = q.viq.replace(/\.$/, '');
//                 if (!viqMap[normalizedViq]) viqMap[normalizedViq] = [];
//                 viqMap[normalizedViq].push({ date: inspection.report_date, present: "Yes", tag: q.tag });
//             });
//         });

//         for (const viq in viqMap) {
//             const dates = sortedInspectionDates.map(date => ({
//                 date,
//                 present: viqMap[viq].some(d => d.date === date) ? "Yes" : "No",
//             }));
//             result.push({ viq, dates });
//         }

//         for (const viq in viqMap) {
//             const firstTag = viqMap[viq][0]?.tag || "Rotational 1";
//             viqTags[viq] = firstTag.toLowerCase().includes("2") ? "R2" : "R1";
//         }
        
//         const allExpectedViqs = allViqsFromCache.map(item => item.question_no);
//         const cacheTagMap = {};
//         allViqsFromCache.forEach(item => { cacheTagMap[item.question_no] = item.tag });

//         const missingViqs = allExpectedViqs.filter(viq => !result.find(item => item.viq === viq) );
//         missingViqs.forEach(viq => {
//             const dates = sortedInspectionDates.map(date => ({ date, present: "No" }));
//             result.push({ viq, dates });
//             const tag = cacheTagMap[viq] || "Rotational 1";
//             viqTags[viq] = tag.toLowerCase().includes("2") ? "R2" : "R1";
//         });
//         // =========================================================

//         // --- [Prediction Calculation] ---
//         finalData = calculatePrediction(result, sortedInspectionDates, viqTags);

//         // --- [Excel Filtering and Sorting Logic] ---
//         // 1. Filter: Remove items with "0.0%" prediction
//         finalData = finalData.filter(item => item.prediction !== "0.0%");

//         // 2. Sort: High to low based on prediction percentage
//         finalData.sort((a, b) => {
//             const predA = parseFloat(a.prediction.replace('%', ''));
//             const predB = parseFloat(b.prediction.replace('%', ''));
//             return predB - predA;
//         });
        
//         // --- [NEW: Map to find Last Present Date & Count] ---
//         const viqMetaData = {};
//         finalData.forEach(item => {
//             const presentDates = item.dates
//                 .filter(d => d.present === "Yes")
//                 .map(d => new Date(d.date)) 
//                 .sort((a, b) => a - b); 

//             viqMetaData[item.viq] = {
//                 lastUsedDate: presentDates.length > 0 ? presentDates[presentDates.length - 1].toISOString().slice(0, 10) : 'N/A',
//                 askCount: presentDates.length,
//             };
//         });

//         // 3. Transform Data for Excel Row Generation
//         const excelRows = finalData.map(item => {
//             const meta = viqMetaData[item.viq];
//             const matchedQuestion = allViqsFromCache.find(v => v.question_no === item.viq);

//             const stripHtml = (html) => {
//                 if (!html) return '';
//                 return html?.replace(/<[^>]*>/g, ' ')?.replace(/\s+/g, ' ')?.trim();
//             };
//             const combinedCheckText = matchedQuestion
//                 ? `${stripHtml(matchedQuestion.suggested_inspector_actions)} | ${stripHtml(matchedQuestion.expected_evidence)}`
//                 : 'N/A';

//             const row = {
//                 'VIQ': item.viq,
//                 'Prediction': item.prediction,
//                 'Type': item.cycleType, // RENAMED
//                 'Date VIQ last used': meta.lastUsedDate, 
//             };
            
//             // Add the dynamic inspection dates as columns with sequential numbering (INSP 1, INSP 2, ...)
//             item.dates.forEach((d, index) => {
//                 row[`INSP ${index + 1}`] = d.present; 
//             });

//             row['INSP.COUNTER'] = meta.askCount;
//             row['Question'] = matchedQuestion ? matchedQuestion.question : 'N/A';
//             row['What the inspector will check'] = combinedCheckText;
//             row['Responsible Officer'] = '';
//             row['IMS Reference'] = '';
            
//             return row;
//         });
        
//         // --- [Excel Generation using ExcelJS] ---
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('VIQ Prediction Report');

//         if (excelRows.length > 0) {
//             const headers = Object.keys(excelRows[0]);
            
//             worksheet.columns = headers.map(h => {
//                 let width = 15;
//                 if (h === 'VIQ' || h === 'Type') width = 10;
//                 else if (h === 'Prediction' || h === 'INSP.COUNTER') width = 12;
//                 else if (h === 'Date VIQ last used') width = 20;
//                 else if (h.startsWith('INSP')) width = 10;

//                 return { header: h, key: h, width: width };
//             });
            
//             // Add all rows
//             worksheet.addRows(excelRows);
            
//             const predictionColIndex = headers.indexOf('Prediction') + 1;
            
//             // --- Header Setup ---
//             // Shift data down one row to make space for the new date header row
//             worksheet.spliceRows(2, 0, []); 

//             // Style the MAIN header row (Row 1)
//             worksheet.getRow(1).eachCell((cell) => {
//                 cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
//                 cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF333333'} };
//                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
//             });
            
//             // Style the DATE header row (Row 2)
//             const dateRow = worksheet.getRow(2);
//             dateRow.font = { italic: true, size: 8 };
//             dateRow.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFDDDDDD'} };
            
//             // Fill the date row for the INSP columns
//             sortedInspectionDates.forEach((date, index) => {
//                 const headerKey = `INSP ${index + 1}`;
//                 const colIndex = headers.indexOf(headerKey) + 1; 
//                 if (colIndex > 0) {
//                     dateRow.getCell(colIndex).value = date;
//                 }
//             });
            
//             // --- Apply Conditional Formatting to data rows (starting from Row 3) ---
//             finalData.forEach((item, index) => {
//                 const rowIndex = index + 3; // Data starts at row 3
//                 const predictionText = item.prediction.replace('%', '');
//                 const predictionValue = parseFloat(predictionText);
//                 const colorArgb = getPredictionColor(predictionValue);
                
//                 const row = worksheet.getRow(rowIndex);
//                 row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
//                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
                    
//                     // Specific bolding for prediction column
//                     if (colNumber === predictionColIndex) {
//                         cell.font = { bold: true };
//                     }
//                 });
//             });
//         }
        
//         // --- [Send the Excel File as a Download] ---
//         res.setHeader(
//             'Content-Type',
//             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//         );
//         res.setHeader(
//             'Content-Disposition',
//             `attachment; filename=VIQ_Prediction_Report_${vessel_id}_${new Date().toISOString().slice(0, 10)}.xlsx`
//         );
        
//         await workbook.xlsx.write(res);
//         res.end();

//     } catch (err) {
//         console.error("Error in viqReportExport:", err);
//         // This will now print the *real* error (e.g., 'VesselInspection is not defined')
//         res.status(500).json({ 
//             success: false, 
//             message: "An unexpected error occurred during Excel report generation.", 
//             error: err.message 
//         });
//     }
// };

const viqReportExport = async (req, res) => {
    const allViqsFromCache = req.app.locals.sireDataCache;
    
    // 💡 FIX: Declare key variables outside the try block to avoid "is not defined" errors
    let inspectionData = [];
    let sortedInspectionDates = [];
    let result = [];
    let viqTags = {};
    let finalData = [];

    try {
        const userId = req.user.id;
        const { vessel_id } = req.body; 
        
        if (!vessel_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Vessel ID is required in the request body." 
            });
        }

        // Replicating the data retrieval and processing logic:
        // =========================================================
        inspectionData = await VesselInspection.findAll({
            attributes: [ 'id', 'report_date' ],
            where: { user_id: userId, vessel_id: vessel_id, status: { [Op.ne]: "deleted" } },
            include: [{
                model: InspectionAllQuestions,
                where: { tag: { [Op.ne]: "Core" } },
                attributes: [ 'viq', 'tag', ],
                required: true,
            }],
            order: [['report_date', 'DESC']]
        });

        if (inspectionData.length === 0) {
            return res.status(200).json({ message: "No data to export for this vessel.", success: true });
        }
        
        const inspectionDates = inspectionData.map(i => i.report_date);
        sortedInspectionDates = [...inspectionDates].sort( (a, b) => new Date(a) - new Date(b));
        const viqMap = {};
        
        inspectionData.forEach(inspection => {
            inspection.inspection_all_questions.forEach(q => {
                const normalizedViq = q.viq.replace(/\.$/, '');
                if (!viqMap[normalizedViq]) viqMap[normalizedViq] = [];
                viqMap[normalizedViq].push({ date: inspection.report_date, present: "Yes", tag: q.tag });
            });
        });

        for (const viq in viqMap) {
            const dates = sortedInspectionDates.map(date => ({
                date,
                present: viqMap[viq].some(d => d.date === date) ? "Yes" : "No",
            }));
            result.push({ viq, dates });
        }

        for (const viq in viqMap) {
            const firstTag = viqMap[viq][0]?.tag || "Rotational 1";
            viqTags[viq] = firstTag.toLowerCase().includes("2") ? "R2" : "R1";
        }
        
        const allExpectedViqs = allViqsFromCache.map(item => item.question_no);
        const cacheTagMap = {};
        allViqsFromCache.forEach(item => { cacheTagMap[item.question_no] = item.tag });

        const missingViqs = allExpectedViqs.filter(viq => !result.find(item => item.viq === viq) );
        missingViqs.forEach(viq => {
            const dates = sortedInspectionDates.map(date => ({ date, present: "No" }));
            result.push({ viq, dates });
            const tag = cacheTagMap[viq] || "Rotational 1";
            viqTags[viq] = tag.toLowerCase().includes("2") ? "R2" : "R1";
        });
        // =========================================================

        // --- [Prediction Calculation] ---
        finalData = calculatePrediction(result, sortedInspectionDates, viqTags);

        // --- [Excel Filtering and Sorting Logic] ---
        // 1. Filter: Remove items with "0.0%" prediction
        finalData = finalData.filter(item => item.prediction !== "0.0%");

        // 2. Sort: High to low based on prediction percentage
        // finalData.sort((a, b) => {
        //     const predA = parseFloat(a.prediction.replace('%', ''));
        //     const predB = parseFloat(b.prediction.replace('%', ''));
        //     return predB - predA;
        // });
        finalData.sort((a, b) => {
            const predA = parseFloat(a.prediction.replace('%', ''));
            const predB = parseFloat(b.prediction.replace('%', ''));
            if (predB !== predA) {
                return predB - predA;
            }

            const compareViq = (viqA, viqB) => {
                const partsA = viqA.split('.').map(p => parseInt(p, 10));
                const partsB = viqB.split('.').map(p => parseInt(p, 10));

                for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    const partA = partsA[i] || 0;
                    const partB = partsB[i] || 0;

                    if (partA !== partB) {
                        return partA - partB;
                    }
                }
                return 0;
            };

            return compareViq(a.viq, b.viq);
        });
        
        // --- [NEW: Map to find Last Present Date & Count] ---
        const viqMetaData = {};
        finalData.forEach(item => {
            const presentDates = item.dates
                .filter(d => d.present === "Yes")
                .map(d => new Date(d.date)) 
                .sort((a, b) => a - b); 

            viqMetaData[item.viq] = {
                lastUsedDate: presentDates.length > 0 ? presentDates[presentDates.length - 1].toISOString().slice(0, 10) : 'N/A',
                askCount: presentDates.length,
            };
        });

        // 3. Transform Data for Excel Row Generation
        const excelRows = finalData.map(item => {
            const meta = viqMetaData[item.viq];
            const matchedQuestion = allViqsFromCache.find(v => v.question_no === item.viq);

            const stripHtml = (html) => {
                if (!html) return '';
                let text = html;
                const htmlEntities = {
                    '&amp;': '&',
                    '&nbsp;': ' ',
                    '&lt;': '<',
                    '&gt;': '>',
                    '&quot;': '"',
                    '&#39;': "'",
                    '&apos;': "'"
                };
                Object.keys(htmlEntities).forEach(entity => {
                    text = text.replace(new RegExp(entity, 'g'), htmlEntities[entity]);
                });

                text = text.replace(/<\/p>/gi, '\n');
                text = text.replace(/<br\s*\/?>/gi, '\n');
                text = text.replace(/<[^>]*>/g, ''); 
                text = text.replace(/\n\s*\n/g, '\n').trim(); 

                return text;
            };
            
            const suggestedActions = stripHtml(matchedQuestion?.suggested_inspector_actions) || 'N/A';
            const expectedEvidence = stripHtml(matchedQuestion?.expected_evidence) || 'N/A';

            // const combinedCheckText = matchedQuestion
            //     ? `Suggested Actions:\n${suggestedActions}\n\nExpected Evidence:\n${expectedEvidence}`
            //     : 'N/A';

            const row = {
                'VIQ': item.viq,
                'Prediction': item.prediction,
                'Type': item.cycleType,
                // 'Date VIQ last used': meta.lastUsedDate, 
                // item.dates.forEach((d, index) => {
                //     row[`INSP ${index + 1}`] = d.present; 
                // });
                // row['INSP.COUNTER'] = meta.askCount;
                'Question': matchedQuestion ? matchedQuestion.question : 'N/A',
                'What the inspector will check': {
                    richText: [
                        { font: { bold: true }, text: `Suggested Inspector's Actions:` },
                        { font: { bold: false }, text: `\n${suggestedActions}\n\n` },
                        { font: { bold: true }, text: 'Expected Evidence:' },
                        { font: { bold: false }, text: `\n${expectedEvidence}` }
                    ]
                },
                'Responsible Officer': '',
                'IMS Reference': ''
            };
            
            return row;
        });
        
        // --- [Excel Generation using ExcelJS] ---
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('VIQ Prediction Report');

        if (excelRows.length > 0) {
            const headers = Object.keys(excelRows[0]);
            
            worksheet.columns = headers.map(h => {
                let width = 15;
                if (h === 'VIQ' || h === 'Type') width = 10;
                else if (h === 'Prediction' || h === 'INSP.COUNTER') width = 12;
                // else if (h === 'Date VIQ last used') width = 20;
                else if (h.startsWith('INSP')) width = 10;
                else if (h === 'Question') width = 60; 
                else if (h === 'What the inspector will check') width = 110; 
                else if (h === 'Responsible Officer' || h === 'IMS Reference') width = 20;

                return { header: h, key: h, width: width };
            });
            
            // Add all rows
            worksheet.addRows(excelRows);
            
            const predictionColIndex = headers.indexOf('Prediction') + 1;
            const questionColIndex = headers.indexOf('Question') + 1;
            const checkColIndex = headers.indexOf('What the inspector will check') + 1;
            
            // --- Header Setup ---
            // Shift data down one row to make space for the new date header row
            worksheet.spliceRows(2, 0, []); 

            // Style the MAIN header row (Row 1)
            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF333333'} };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
            
            // Style the DATE header row (Row 2)
            const dateRow = worksheet.getRow(2);
            dateRow.font = { italic: true, size: 8 };
            dateRow.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFDDDDDD'} };
            
            // Fill the date row for the INSP columns
            sortedInspectionDates.forEach((date, index) => {
                const headerKey = `INSP ${index + 1}`;
                const colIndex = headers.indexOf(headerKey) + 1; 
                if (colIndex > 0) {
                    dateRow.getCell(colIndex).value = date;
                }
            });
            
            // --- Apply Conditional Formatting and Cell Wrapping to data rows (starting from Row 3) ---
            finalData.forEach((item, index) => {
                const rowIndex = index + 3; // Data starts at row 3
                const predictionText = item.prediction.replace('%', '');
                const predictionValue = parseFloat(predictionText);
                const colorArgb = getPredictionColor(predictionValue);
                
                const row = worksheet.getRow(rowIndex);
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
                    
                    // Specific bolding for prediction column
                    if (colNumber === predictionColIndex) {
                        cell.font = { bold: true };
                    }

                    // 🌟 MODIFICATION 3: Enable word wrapping for the multi-line cells
                    if (colNumber === questionColIndex || colNumber === checkColIndex) {
                        cell.alignment = { wrapText: true, vertical: 'top' };
                    }

                    // Apply bolding to the new multi-line check text labels (Approximation)
                    if (colNumber === checkColIndex && typeof cell.value === 'string' && cell.value.includes('\n')) {
                         // This is where you would apply rich text for true bolding if needed,
                         // but without rich text, the best we can do is rely on the \n for visual separation.
                         // To simulate a bold header, we'll try to adjust the content's font property,
                         // although this applies to the whole cell without rich text.
                         // For now, we will leave it to the string formatting (`Suggested Actions:\n...`)
                    }
                });
            });
        }
        
        // --- [Send the Excel File as a Download] ---
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=VIQ_Prediction_Report_${vessel_id}_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Error in viqReportExport:", err);
        // This will now print the *real* error (e.g., 'VesselInspection is not defined')
        res.status(500).json({ 
            success: false, 
            message: "An unexpected error occurred during Excel report generation.", 
            error: err.message 
        });
    }
};


const getAllVesselInspectionsWithTotalScore = async (req, res) => {
    try {
        const { search } = req.query;

        const searchByName = search ? { name: { [Op.like]: `%${search}%` } } : {};

        // Fetch all vessels for this user
        const vessels = await Vessel.findAll({
            where: {
                [Op.and]: [{ user_id: req.user.id }, { status: "active" }, searchByName],
            },
            order: [["id", "DESC"]],
        });

        const result = await Promise.all(
            vessels.map(async (vessel) => {
                // Get all active inspections for this vessel
                const inspections = await VesselInspection.findAll({
                    where: {
                        vessel_id: vessel.id,
                        status: "active",
                    },
                    include: [
                        {
                            model: InspectionQuestions,
                            include: [InspectionScore],
                        },
                    ],
                    order: [["report_date", "DESC"]],
                });

                if (!inspections.length) return null;

                let validInspectionCount = 0;
                let totalScoreWithoutManual = 0;

                // Loop through each inspection for this vessel
                for (const insp of inspections) {
                    let coreScore = 0;
                    let rotationalScore = 0;
                    let scoring = [];

                    for (const question of insp.inspection_questions || []) {
                        const tag = question.tag;
                        const scores = question.inspection_scores || [];

                        const questionScore = scores.reduce((sum, entry) => sum + (entry.score || 0), 0);

                        scores.forEach((entry) => {
                            if (entry.isNegative === "yes") {
                                scoring.push(entry.score);
                            }
                        });

                        if (tag === "Core") {
                            coreScore += questionScore;
                        } else if (tag === "Rotational 1" || tag === "Rotational 2") {
                            rotationalScore += questionScore;
                        }
                    }

                    const isManualScore = scoring.some((score) => score == null);

                    // Only include if NOT manual
                    if (!isManualScore) {
                        validInspectionCount++;
                        totalScoreWithoutManual += coreScore + rotationalScore;
                    }
                }

                return {
                    vessel_id: vessel.id,
                    vesselName: vessel.name || "Unknown Vessel",
                    countOfInspectionByVessel: inspections.length,
                    validInspectionCount: validInspectionCount,
                    totalScore: totalScoreWithoutManual,
                    super_id: inspections[0]?.super_id || null,
                };
            })
        );

        res.status(200).json({
            message: "success",
            sucess: true,
            data: result.filter(Boolean),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: err.message,
        });
    }
};


module.exports = {
    getVessel,
    createVessel,
    updateVessel,
    getInspections,
    getInspectionsByVessel,
    getViewInspection,
    updateScore,
    deleteInspection,
    editIsWrong,
    updateInspectorName,
    vesselAndVesselInspectionCount,
    viqPredition,
    dataEntriesList,
    viqReportExport,
    getAllVesselInspectionsWithTotalScore,
}
