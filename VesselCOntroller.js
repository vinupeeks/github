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

        const { search } = req.query

        const searchByName = search ? { name: {[Op.like]: `%${search}%`} } : {}

        const vesselDetails = await Vessel.findAll({
            where: {
                [Op.and]: [{user_id: req.user.id}, {status: "active"}, searchByName]
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
                inspectionDate: lastInspection.report_date
            };
        }))).filter(Boolean);

        res.status(200).json({
            message: "success",
            sucess: true,
            data: result
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
                isManualScore,
                coreScore,
                rotationalScore,
                totalScore: coreScore + rotationalScore,
                super_id: inspection.super_id,
                status: inspection.status,
                createdOn: inspection.createdAt,
                inspectionDate: inspection.report_date
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

const viqPredition = async (req, res) => {
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

        const inspectionsWithSequence = inspectionData.map((inspection, index) => ({
            ...inspection.toJSON(), sequence_number: index + 1
        }));

        // Calculate predictions for each VIQ
        const calculateVIQPredictions = (inspections) => {
            if (!inspections || inspections.length === 0) {
                return [];
            }

            const nextInspectionSequence = inspections.length + 1;
            const viqMap = new Map();

            // Track each VIQ's last appearance and type
            inspections.forEach((inspection, inspectionIndex) => {
                const sequenceNumber = inspectionIndex + 1;

                inspection.inspection_all_questions.forEach(question => {
                    const viqKey = question.viq;

                    if (!viqMap.has(viqKey)) {
                        viqMap.set(viqKey, {
                            viq: question.viq,
                            tag: question.tag,
                            lastAppearance: sequenceNumber,
                            appearances: [sequenceNumber],
                            cycle: question.tag === 'Rotational 1' ? 3 : 6
                        });
                    } else {
                        const existing = viqMap.get(viqKey);
                        existing.lastAppearance = sequenceNumber;
                        existing.appearances.push(sequenceNumber);
                    }
                });
            });

            // Calculate prediction for each VIQ
            const predictions = Array.from(viqMap.values()).map(viqData => {
                const gap = nextInspectionSequence - viqData.lastAppearance;
                const cycle = viqData.cycle;

                const chance = calculateChancePercentage(cycle, gap);

                return {
                    viq: viqData.viq,
                    tag: viqData.tag,
                    cycle: viqData.cycle,
                    lastAppearance: viqData.lastAppearance,
                    nextInspection: nextInspectionSequence,
                    gap: gap,
                    chance: chance,
                    appearances: viqData.appearances
                };
            });

            // Sort by chance percentage (descending)
            return predictions.sort((a, b) => b.chance - a.chance);
        };

        const calculateChancePercentage = (cycle, gap) => {
            // Your formula: Chance (%) = 100 × (1 - |Cycle - Gap| / Cycle)
            const absoluteDifference = Math.abs(cycle - gap);
            const chance = 100 * (1 - (absoluteDifference / cycle));

            // Ensure chance is between 0 and 100
            return Math.max(0, Math.min(100, Math.round(chance * 10) / 10));
        };
        
        const predictions = calculateVIQPredictions(inspectionsWithSequence);

        res.status(200).json({
            message: "Vessel inspections and question data retrieved successfully.",
            success: true,
            data: predictions,
        });

    } catch (err) {
        console.error("Error in viqPredition:", err);
        res.status(500).json({ success: false, message: "An unexpected error occurred during data retrieval.", error: err.message });
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
}