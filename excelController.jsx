const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require('../models/');
const { where, Op } = require("sequelize");
const Vessel = db.vessels;
const VesselInspections = db.vesselInspections;
const InspectionQuestions = db.inspectionQuestions;
const InspectionScore = db.inspectionScore;
const OPRank = db.crewPossitions;
const Superient = db.superintendents;


const generateVesselExcelReport = async (req, res) => {
    try {
        const { type = "human", filter = {} } = req.body;

        const vesselWhere = {
            status: "active",
            ...(filter.vessel_id && { id: filter.vessel_id })
        };

        const inspectionWhere = {
            status: "active",
            ...(filter.fromDate &&
                filter.toDate && {
                report_date: { [Op.between]: [filter.fromDate, filter.toDate] },
            }),
        };

        let scoreWhere = {};
        if (type === "human") {
            scoreWhere = { category: "human" };
        } else if (filter.category) {
            scoreWhere = { category: filter.category };
        }

        if (filter.human_name) {
            scoreWhere.human_name = { [Op.like]: `%${filter.human_name}%` };
        }

        // -------------------------
        // HUMAN TYPE EXPORT
        // -------------------------
        if (type === "human") {
            const includeOptions = [
                {
                    model: VesselInspections,
                    attributes: [["id", "inspection_id"], "report_date", "company_name", "vesselsOperation"],
                    where: inspectionWhere,
                    required: true,
                    include: [
                        {
                            model: InspectionQuestions,
                            attributes: [["id", "question_id"]],
                            required: false,
                            include: [
                                {
                                    model: InspectionScore,
                                    required: false,
                                    where: scoreWhere,
                                    attributes: ["remark", "category", "crew_id", "human_name", "pif", "operator_comments"],
                                    include: [
                                        {
                                            model: OPRank,
                                            required: false,
                                            attributes: [["title", "crew_position"]],
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ];

            const data = await Vessel.findAll({
                attributes: [["id", "vessel_id"], ["name", "vessel_name"]],
                where: vesselWhere,
                include: includeOptions
            });

            const excelData = [];
            data.forEach((vessel) => {
                const v = vessel.get({ plain: true });

                v.vessel_inspections.forEach((insp) => {
                    insp.inspection_questions.forEach((q) => {
                        q.inspection_scores.forEach((score) => {
                            if (score.category === "human") {
                                let pifData = [];
                                try {
                                    pifData = score.pif ? JSON.parse(score.pif) : [];
                                } catch {
                                    pifData = [];
                                }

                                const pifText = pifData.map(p =>
                                    `${p.pifNumber}: ${p.pifDescription}`
                                ).join("\n");

                                excelData.push({
                                    vessel: v.vessel_name,
                                    date: new Date(insp.report_date).toLocaleDateString("en-GB"),
                                    company: insp.company_name,
                                    observation: score.remark,
                                    pif: pifText,
                                    rank: score.crew_position ? score.crew_position.crew_position : "-",
                                    name: score.human_name
                                });
                            }
                        });
                    });
                });
            });

            if (excelData.length === 0) {
                return res.status(200).json({
                    message: "No records found, Excel not generated",
                    success: true,
                    fileUrl: null,
                    recordCount: 0
                });
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("HUMAN");

            worksheet.getColumn(1).width = 20;
            worksheet.getColumn(2).width = 15;
            worksheet.getColumn(3).width = 25;
            worksheet.getColumn(4).width = 60;
            worksheet.getColumn(5).width = 60;
            worksheet.getColumn(6).width = 15;
            worksheet.getColumn(7).width = 25;

            const headers = ["VESSEL", "DATE", "OIL COMPANY", "OBSERVATION", "PIF", "OP1-RANK", "NAME"];
            const headerRow = worksheet.addRow(headers);

            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEBF1DE" } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { bold: true, size: 12 };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });

            excelData.forEach((rowData) => {
                const row = worksheet.addRow([
                    rowData.vessel,
                    rowData.date,
                    rowData.company,
                    rowData.observation,
                    rowData.pif,
                    rowData.rank,
                    rowData.name
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" }
                    };
                });
            });

            worksheet.views = [{ state: "frozen", ySplit: 1 }];

            const outputDir = path.join(__dirname, "../../files/excel/manualreview");
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const filePath = path.join(outputDir, `vessel_human_report_${Date.now()}.xlsx`);
            await workbook.xlsx.writeFile(filePath);

            return res.status(200).json({
                message: "Excel generated successfully",
                success: true,
                fileUrl: `/files/excel/manualreview/${path.basename(filePath)}`,
                recordCount: excelData.length
            });
        }

        // -------------------------
        // OBS TYPE EXPORT
        // -------------------------
        if (type === "obs") {
            const includeOptions = [
                {
                    model: VesselInspections,
                    attributes: [["id", "inspection_id"], "report_date", "master", "cheif_engineer_name", "company_name", "inspector", "port_name", "country", "vesselsOperation"],
                    where: inspectionWhere,
                    include: [
                        { model: Superient, attributes: ["name"] },
                        {
                            model: InspectionQuestions,
                            attributes: [["id", "question_id"], "chapter_no", "viq", "tag"],
                            required: false,
                            include: [
                                {
                                    model: InspectionScore,
                                    where: scoreWhere,
                                    required: false,
                                    attributes: ["remark", "category", "soc", "noc", "isWrong", "isNegative", "risk", "pif", "operator_comments"],
                                    include: [{ model: OPRank, required: false, attributes: [["title", "crew_position"]] }],
                                },
                            ],
                        },
                    ],
                },
            ];

            const data = await Vessel.findAll({
                attributes: [["id", "vessel_id"], ["name", "vessel_name"]],
                where: vesselWhere,
                include: includeOptions
            });

            const excelData = [];
            data.forEach((vessel) => {
                const v = vessel.get({ plain: true });

                v.vessel_inspections.forEach((insp) => {
                    insp.inspection_questions.forEach((q) => {
                        q.inspection_scores.forEach((score) => {
                            // 🔹 Parse Owners Comments JSON
                            let ownersComments = [];
                            try {
                                ownersComments = score.operator_comments ? JSON.parse(score.operator_comments) : [];
                            } catch {
                                ownersComments = [];
                            }

                            // 🔹 Format for Excel (multi-line string)
                            const ownersCommentsText = ownersComments.map(c => {
                                return [
                                    `Date: ${c.date || "-"}`,
                                    `By: ${c.name || "-"}`,
                                    c.immediateCause ? `Immediate Cause: ${c.immediateCause}` : "",
                                    c.rootCause ? `Root Cause: ${c.rootCause}` : "",
                                    c.correctiveAction ? `Corrective Action: ${c.correctiveAction}` : "",
                                    c.preventativeAction ? `Preventative Action: ${c.preventativeAction}` : "",
                                ].filter(Boolean).join("\n");
                            }).join("\n\n-----------------\n\n");

                            excelData.push({
                                vessel: v.vessel_name,
                                company: insp.company_name,
                                inspector: insp.inspector,
                                date: new Date(insp.report_date).toLocaleDateString("en-GB"),
                                operation: insp.vesselsOperation,
                                port: insp.port_name,
                                country: insp.country,
                                category: score.category,
                                chapter: q.chapter_no,
                                code: q.viq,
                                questionType: q.tag,
                                soc: score.soc,
                                noc: score.noc,
                                observation: score.remark,
                                wrong: score.isWrong ? "Wrong" : "Right",
                                positive: score.isNegative ? "Negative" : "Positive",
                                risk: score.risk,
                                ownersComments: ownersCommentsText || "-",
                                master: insp.master,
                                chief_engineer: insp.cheif_engineer_name,
                                superintendent: insp.superintendent ? insp.superintendent.name : "-"
                            });
                        });
                    });
                });
            });

            if (excelData.length === 0) {
                return res.status(200).json({
                    message: "No records found, Excel not generated",
                    success: true,
                    fileUrl: null,
                    recordCount: 0
                });
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("OBS");

            const colWidths = [20, 25, 20, 15, 20, 15, 15, 20, 15, 20, 15, 25, 25, 60, 20, 20, 20, 60, 25, 25, 25];
            colWidths.forEach((w, i) => worksheet.getColumn(i + 1).width = w);

            const headers = [
                "VESSEL", "INSPECTING COMPANY", "Inspector", "DATE",
                "Operation", "Port", "Country", "HARDWARE-PROCESS-HUMAN-PHOTO",
                "Chapter", "QUESTIONAIRE CODE", "Question type", "S.O.C", "N.O.C",
                "OBSERVATION", "Right or wrong", "POSITIVE OR NEGATIVE",
                "Risk", "Operator Comments", "Master", "Chief Engineer", "Superintendent"
            ];

            const headerRow = worksheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9B3FF" } };
                cell.font = { bold: true, size: 11 };
                cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });

            excelData.forEach((rowData) => {
                const row = worksheet.addRow([
                    rowData.vessel,
                    rowData.company,
                    rowData.inspector,
                    rowData.date,
                    rowData.operation,
                    rowData.port,
                    rowData.country,
                    rowData.category,
                    rowData.chapter,
                    rowData.code,
                    rowData.questionType,
                    rowData.soc,
                    rowData.noc,
                    rowData.observation,
                    rowData.wrong,
                    rowData.positive,
                    rowData.risk,
                    rowData.ownersComments, // 🔹 formatted text here
                    rowData.master,
                    rowData.chief_engineer,
                    rowData.superintendent
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" }
                    };
                });
            });

            worksheet.views = [{ state: "frozen", ySplit: 1 }];

            const outputDir = path.join(__dirname, "../../files/excel/manualreview");
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const filePath = path.join(outputDir, `vessel_obs_report_${Date.now()}.xlsx`);
            await workbook.xlsx.writeFile(filePath);

            return res.status(200).json({
                message: "Excel generated successfully",
                success: true,
                fileUrl: `/files/excel/manualreview/${path.basename(filePath)}`,
                recordCount: excelData.length
            });
        }
    } catch (err) {
        console.error("Error generating Excel:", err);
        res.status(500).json({
            success: false,
            message: "Error generating Excel report",
            error: err.message
        });
    }
};


const VesselExcelReportData = async (req, res) => {
    try {
        const { type = "default", filter = {} } = req.body;

        const vesselWhere = {
            status: "active",
            ...(filter.vessel_id && { id: filter.vessel_id })
        }; const inspectionWhere = {
            status: "active",
            ...(filter.fromDate &&
                filter.toDate && {
                report_date: { [Op.between]: [filter.fromDate, filter.toDate] },
            }),
        };
        let scoreWhere = {};
        if (type === "human") {
            scoreWhere = { category: "human" };
        } else if (filter.category) {
            scoreWhere = { category: filter.category };
        } else {
            scoreWhere = {};
        }

        if (filter.human_name) {
            scoreWhere.human_name = {
                [Op.like]: `%${filter.human_name}%`,
            };
        }

        let includeOptions = [];

        if (type === "human") {
            includeOptions = [
                {
                    model: VesselInspections,
                    attributes: [["id", "inspection_id"], "report_date", "company_name", "vesselsOperation"],
                    where: inspectionWhere,
                    required: true,
                    include: [
                        {
                            model: InspectionQuestions,
                            attributes: [["id", "question_id"]],
                            required: false,
                            include: [
                                {
                                    model: InspectionScore,
                                    required: false,
                                    where: scoreWhere,
                                    attributes: ["remark", "category", "crew_id", "human_name", "pif", "operator_comments"],
                                    include: [{ model: OPRank, required: false, attributes: [["title", "crew_position"]], }]
                                }
                            ]
                        }
                    ]
                }
            ];
        } else {
            includeOptions = [
                {
                    model: VesselInspections,
                    attributes: [["id", "inspection_id"], "report_date", "master", "cheif_engineer_name", "company_name", "inspector", "port_name", "country", "vesselsOperation"],
                    where: inspectionWhere,
                    include: [
                        { model: Superient, attributes: ["name"], },
                        {
                            model: InspectionQuestions,
                            attributes: [["id", "question_id"], "chapter_no", "viq", "tag",],
                            required: false,
                            include: [
                                {
                                    model: InspectionScore,
                                    where: scoreWhere,
                                    required: false,
                                    attributes: ["remark", "category", "soc", "noc", "isWrong", "isNegative", "risk", "pif", "operator_comments"],
                                    include: [{ model: OPRank, required: false, attributes: [["title", "crew_position"]], },],
                                },
                            ],
                        },
                    ],
                },
            ];
        }

        const data = await Vessel.findAll({
            attributes: [["id", "vessel_id"], ["name", "vessel_name"]],
            where: vesselWhere,
            include: includeOptions
        });

        return res.json({
            success: true,
            message: type === "human"
                ? "Human type report fetched successfully"
                : "Obs type report fetched successfully",
            data
        });

    } catch (err) {
        console.error("Error fetching report:", err);
        return res.status(500).json({
            success: false,
            message: "Error while fetching vessel report",
            error: err.message
        });
    }
};

module.exports = {
    generateVesselExcelReport,
    VesselExcelReportData
};
