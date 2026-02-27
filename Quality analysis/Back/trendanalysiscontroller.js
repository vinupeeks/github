const { Op, Sequelize } = require("sequelize")
const dayjs = require("dayjs");
const {
    Vessel,
    InspectionVessels,
    InspectionQuestions,
    InspectionObservations,
    Questions,
    Chapters
} = require("../models")


exports.getTrendAnalysisSummary = async (req, res) => {
    try {
        const user_id = Number(req.user.role_id === 1 && req.query.user_id ? req.query.user_id : req.user.id);

        //    FETCH ALL INSPECTIONS
        const inspections = await InspectionVessels.findAll({
            where: {
                user_id,
                status: "ACTIVE",
            },
            include: [
                {
                    model: InspectionQuestions,
                    as: "inspection_questions",
                    include: [
                        {
                            model: InspectionObservations,
                            as: "observations",
                        },
                        {
                            model: Questions,
                            as: "question",
                        },
                    ],
                },
            ],
            order: [["inspection_date", "ASC"]],
        });

        if (!inspections.length) {
            return res.json({ success: true, data: {} });
        }

        //    GROUP INSPECTIONS BY YEAR
        const inspectionsByYear = {};

        inspections.forEach((inspection) => {
            const year = dayjs(inspection.inspection_date).year();
            if (!inspectionsByYear[year]) inspectionsByYear[year] = [];
            inspectionsByYear[year].push(inspection);
        });

        const result = {};

        //    YEAR LOOP
        for (const year of Object.keys(inspectionsByYear)) {
            const yearNum = Number(year);
            const yearInspections = inspectionsByYear[year];
            const inspectionCount = yearInspections.length || 1;

            const isPartialYear = yearNum === dayjs().year();
            const monthsConsidered = isPartialYear ? dayjs().month() + 1 : 12;

            //    FLATTEN OBSERVATIONS
            const observations = [];

            yearInspections.forEach((inspection) => {
                inspection.inspection_questions.forEach((iq) => {
                    iq.observations.forEach((obs) => {
                        observations.push({
                            vesselId: inspection.vessel_id,
                            category: obs.category,
                            type: obs.type,
                            tag: iq.question?.tag || "UNKNOWN",
                            pif: obs.pif_no,
                            tmsa: obs.tmsa,
                            chapter: iq.question?.chapter_id || "UNKNOWN",
                        });
                    });
                });
            });

            const totalObs = observations.length || 1;

            //    OVERALL
            const overall = {
                totalObservations: observations.length,
                totalNegativeObservations: observations.filter(o => o.type === "NEGATIVE").length,
                totalPositiveObservations: observations.filter(o => o.type === "POSITIVE").length,
                totalGraduatedObservations: observations.filter(o => o.type === "GRADUATED").length,
            };

            const overallAverages = {
                avgTotalObservations: +(overall.totalObservations / inspectionCount).toFixed(2),
                avgNegativeObservations: +(overall.totalNegativeObservations / inspectionCount).toFixed(2),
                avgPositiveObservations: +(overall.totalPositiveObservations / inspectionCount).toFixed(2),
                avgGraduatedObservations: +(overall.totalGraduatedObservations / inspectionCount).toFixed(2),
            };

            //    BY CATEGORY
            const byCategory = {};

            observations.forEach(o => {
                if (!o.category) return;

                if (!byCategory[o.category]) {
                    byCategory[o.category] = {
                        totalObservations: 0,
                        totalNegativeObservations: 0,
                    };
                }

                byCategory[o.category].totalObservations++;
                if (o.type === "NEGATIVE") {
                    byCategory[o.category].totalNegativeObservations++;
                }
            });

            Object.keys(byCategory).forEach(cat => {
                byCategory[cat].averages = {
                    avgTotalObservations:
                        +(byCategory[cat].totalObservations / inspectionCount).toFixed(2),
                    avgNegativeObservations:
                        +(byCategory[cat].totalNegativeObservations / inspectionCount).toFixed(2),
                };
            });

            //    BY TAG (TYPE)
            const byTag = {};
            observations
                .filter(o => o.type === "NEGATIVE")
                .forEach(o => {
                    byTag[o.tag] = (byTag[o.tag] || 0) + 1;
                });

            //    RISK AVERAGES (LIMITED DATA)
            // const riskAverages = {
            //     negativePerInspection:
            //         +(overall.totalNegativeObservations / inspectionCount).toFixed(2),
            // };

            //    CHAPTER NEGATIVE
            const chapterNegativeAverages = {};
            observations
                .filter(o => o.type === "NEGATIVE")
                .forEach(o => {
                    chapterNegativeAverages[o.chapter] =
                        (chapterNegativeAverages[o.chapter] || 0) + 1;
                });

            Object.keys(chapterNegativeAverages).forEach(ch => {
                chapterNegativeAverages[ch] =
                    +(chapterNegativeAverages[ch] / inspectionCount).toFixed(2);
            });

            //    BY VESSEL
            // const byVessel = {};
            // observations.forEach(o => {
            //     if (!byVessel[o.vesselId]) {
            //         byVessel[o.vesselId] = { totalNegativeObservations: 0 };
            //     }
            //     if (o.type === "NEGATIVE") {
            //         byVessel[o.vesselId].totalNegativeObservations++;
            //     }
            // });

            // Object.keys(byVessel).forEach(v => {
            //     byVessel[v].avgNegativeObservations =
            //         +(byVessel[v].totalNegativeObservations / inspectionCount).toFixed(2);
            // });

            //    HUMAN CUMULATIVE
            // const cumulativeHumans = {
            //     avgNegativeObservations:
            //         +(observations.filter(o => o.category === "HUMAN" && o.type === "NEGATIVE").length / inspectionCount).toFixed(2),
            //     avgPositiveObservations:
            //         +(observations.filter(o => o.category === "HUMAN" && o.type === "POSITIVE").length / inspectionCount).toFixed(2),
            // };

            // const crewPositiveAverages = cumulativeHumans.avgPositiveObservations;
            // const crewNegativeAverages = cumulativeHumans.avgNegativeObservations;

            //    PIF
            const byPIF = {};
            observations
                .filter(o => o.type === "NEGATIVE")
                .forEach(o => {
                    if (!o.pif) return;
                    byPIF[o.pif] = (byPIF[o.pif] || 0) + 1;
                });
            Object.keys(byPIF).forEach(pif => {
                byPIF[pif] = +(byPIF[pif] / inspectionCount).toFixed(2);
            });

            //    BY TMSA (COUNT + AVERAGE)
            const byTMSA = {};

            observations.forEach(o => {
                if (!o.tmsa) return;

                if (!byTMSA[o.tmsa]) {
                    byTMSA[o.tmsa] = { count: 0, average: 0, };
                }

                byTMSA[o.tmsa].count += 1;
            });

            Object.keys(byTMSA).forEach(tmsa => {
                byTMSA[tmsa].average = +(
                    byTMSA[tmsa].count / inspectionCount
                ).toFixed(2);
            });

            //    BY TMSA GROUP (COUNT + AVERAGE)
            const byTMSAGRP = {};

            Object.keys(byTMSA).forEach(code => {
                const grp = code.split(".")[0];

                if (!byTMSAGRP[grp]) {
                    byTMSAGRP[grp] = { count: 0, average: 0, };
                }

                byTMSAGRP[grp].count += byTMSA[code].count;
            });

            Object.keys(byTMSAGRP).forEach(grp => {
                byTMSAGRP[grp].average = +(
                    byTMSAGRP[grp].count / inspectionCount
                ).toFixed(2);
            });


            //    STORE YEAR RESULT
            result[year] = {
                year: yearNum,
                isPartialYear,
                monthsConsidered,
                overall,
                overallAverages,
                vesselInspectionCount: inspectionCount,
                byCategory,
                byTag,
                chapterNegativeAverages,
                byPIF,
                byTMSA,
                byTMSAGRP,
                // yearInspections
            };
        }

        return res.json({
            success: true,
            user_id,
            data: result,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Trend analysis failed" });
    }
};
