const db = require('../models')
const Benchmark = db.benchmark;
const BenchmarkInspections = db.benchmarkVesselInspections;
const BenchmarkQuestions = db.benchmarkInspectionQuestions;
const BenchmarkScores = db.benchmarkInspectionScore;
const Op = db.Sequelize.Op;


const createBenchMark = async (req, res) => {
    const currentUserId = req.user.id;

    // 2. Destructure payload
    const { name, reportDate, totalInspections, inspectionDetails } = req.body;

    // Basic validation
    if (!name || !currentUserId || !totalInspections || !inspectionDetails) {
        return res.status(400).send({ message: "Missing required fields or inspection details." });
    }

    // Ensure totalInspections is a positive integer
    if (typeof totalInspections !== 'number' || totalInspections < 1) {
        return res.status(400).send({ message: "totalInspections must be a positive number." });
    }

    const transaction = await db.sequelize.transaction(); // Start a transaction

    try {
        const benchmark = await Benchmark.create({
            user_id: currentUserId,
            name: name,
            created_by: currentUserId,
            updated_by: currentUserId,
        }, { transaction });

        const benchmarkId = benchmark.id;

        // --- 4. Create entries in 'benchmark_vessel_inspections' table (totalInspections count) ---
        const vesselInspectionData = [];
        for (let i = 0; i < totalInspections; i++) {
            vesselInspectionData.push({
                user_id: currentUserId,
                benchmark_id: benchmarkId,
                report_date: reportDate,
                created_by: currentUserId,
                updated_by: currentUserId
            });
        }

        const vesselInspections = await BenchmarkInspections.bulkCreate(vesselInspectionData, { transaction });

        // We link ALL questions to the ID of the FIRST created vessel inspection record,
        const firstBenchmarkInspectionId = vesselInspections[0].id;

        // --- 5. Create entries in 'benchmark_inspection_questions' table (based on inspectionDetails array length) ---
        const questionRecords = inspectionDetails.map(detail => ({
            benchmark_inspection_id: firstBenchmarkInspectionId,
            chapter_no: detail.chapterNo,
            viq: detail.viq,
            tag: detail.tag,
            created_by: currentUserId,
            updated_by: currentUserId
        }));

        const questions = await BenchmarkQuestions.bulkCreate(questionRecords, { transaction });

        // --- 6. Create entries in 'benchmark_inspection_scores' table (based on negativeEntries count) ---
        const scoreRecords = [];
        questions.forEach((question, index) => {
            const detail = inspectionDetails[index];
            if (detail.negativeEntries && Array.isArray(detail.negativeEntries)) {
                detail.negativeEntries.forEach(score => {
                    scoreRecords.push({
                        benchmark_question_id: question.id,
                        category: score.category,
                        isNegative: score.isNegative && ['yes', 'no'].includes(score.isNegative) ? score.isNegative : "yes",
                        created_by: currentUserId,
                        updated_by: currentUserId
                    });
                });
            }
        });

        await BenchmarkScores.bulkCreate(scoreRecords, { transaction });
        await transaction.commit();

        res.status(201).send({
            message: "Benchmark created successfully",
            benchmarkId: benchmarkId,
            totalVesselInspectionsCreated: totalInspections,
            totalQuestionsCreated: questions.length,
            totalScoresCreated: scoreRecords.length
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Error creating benchmark:", error);
        res.status(500).send({
            message: "Error creating benchmark",
            error: error.message
        });
    }
};

const getBenchmarksByUserId = async (req, res) => {
    // 1. Get userId from the authenticated user token (req.user)
    const currentUserId = req.user.id;

    if (!currentUserId) {
        return res.status(401).send({ message: "User not authenticated." });
    }

    try {
        // NOTE: The 'as' property should be defined in your associations file.
        // If not defined, Sequelize uses the pluralized model name (e.g., benchmark_vessel_inspections).

        const benchmarks = await Benchmark.findAll({
            where: {
                user_id: currentUserId,
                status: 'active'
            },
            order: [['createdAt', 'DESC']],

            // Remove the 'group: ['benchmarks.id']' to ensure all nested rows are returned.
            // When including nested models, Sequelize will return duplicate parent rows 
            // but map the child data correctly.

            include: [
                {
                    model: BenchmarkInspections,
                    // attributes: ['id', 'user_id', 'benchmark_id', 'report_date'], // Keep attributes for client use
                    required: false,
                    include: [
                        {
                            model: BenchmarkQuestions,
                            // attributes: ['id', 'benchmark_inspection_id', 'chapter_no', 'viq', 'tag'],
                            required: false,
                            include: [
                                {
                                    model: BenchmarkScores,
                                    // attributes: ['id', 'benchmark_question_id', 'category', 'isNegative'],
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ],
            // DO NOT use group: ['benchmarks.id'] here, or you will lose nested data.
        });

        // --- Post-Query Data Mapping (Calculate Counts and Clean Up) ---
        const responseData = benchmarks.map(benchmark => {
            const data = benchmark.get({ plain: true });

            // Calculate totalInspections from the array length of the association
            const totalInspections = data.benchmark_vessel_inspections
                ? data.benchmark_vessel_inspections.length
                : 0;

            // Calculate totalQuestions and totalScores for a better listing summary
            let totalQuestions = 0;
            let totalScores = 0;

            if (data.benchmark_vessel_inspections && data.benchmark_vessel_inspections.length > 0) {
                // Since all questions are currently linked to the first inspection record's ID (as per your create logic),
                // we'll count the children of the first inspection entry.
                const firstInspection = data.benchmark_vessel_inspections[0];

                if (firstInspection.benchmark_inspection_questions) {
                    totalQuestions = firstInspection.benchmark_inspection_questions.length;

                    firstInspection.benchmark_inspection_questions.forEach(question => {
                        if (question.benchmark_inspection_scores) {
                            totalScores += question.benchmark_inspection_scores.length;
                        }
                    });
                }
            }

            return {
                id: data.id,
                name: data.name,
                status: data.status,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                // Summary Counts for the listing view
                totalInspections: totalInspections,
                totalQuestions: totalQuestions,
                totalScores: totalScores,
                // Include the full nested data structure
                vesselInspections: data.benchmark_vessel_inspections
            };
        });

        res.status(200).send(responseData); // Send the mapped data

    } catch (error) {
        console.error("Error fetching benchmarks for user:", error);
        res.status(500).send({
            message: "Error fetching benchmarks",
            error: error.message
        });
    }
};

const editBenchmark = async (req, res) => {
    // 1. Get benchmarkId from URL parameter
    const benchmarkId = req.params.id;
    // 2. Get the user ID for updated_by
    const currentUserId = req.user.id;

    // 3. Destructure payload (similar to create, but allowing for partial updates)
    const {
        name,
        reportDate,
        status, // Allow updating the benchmark status
        totalInspections,
        inspectionDetails
    } = req.body;

    if (!benchmarkId || !currentUserId) {
        return res.status(400).send({ message: "Missing required identifier (Benchmark ID or User ID)." });
    }

    // Ensure totalInspections is valid if provided
    if (totalInspections !== undefined && (typeof totalInspections !== 'number' || totalInspections < 1)) {
        return res.status(400).send({ message: "totalInspections must be a positive number if provided for update." });
    }

    const transaction = await db.sequelize.transaction(); // Start a transaction

    try {
        // --- A. Find and Update main 'benchmarks' record ---
        const existingBenchmark = await Benchmark.findByPk(benchmarkId, { transaction });

        if (!existingBenchmark) {
            await transaction.rollback();
            return res.status(404).send({ message: `Benchmark with ID ${benchmarkId} not found.` });
        }

        // Update the main benchmark details
        await existingBenchmark.update({
            name: name || existingBenchmark.name,
            status: status || existingBenchmark.status,
            updated_by: currentUserId,
        }, { transaction });

        // --- B. Handle Deletion/Recreation of Child Records (if details are provided) ---
        if (inspectionDetails && totalInspections !== undefined) {
            // 1. **DESTROY** existing dependent records

            // Delete Scores first (must precede Question deletion due to FK constraint)
            await BenchmarkScores.destroy({
                where: {
                    benchmark_question_id: {
                        [Op.in]: db.sequelize.literal(`(
                            SELECT id 
                            FROM benchmark_inspection_questions 
                            WHERE benchmark_inspection_id IN (
                                SELECT id 
                                FROM benchmark_vessel_inspections 
                                WHERE benchmark_id = ${benchmarkId}
                            )
                        )`)
                    }
                },
                transaction
            });

            // Delete Questions (must precede Inspection deletion due to FK constraint)
            await BenchmarkQuestions.destroy({
                where: {
                    benchmark_inspection_id: {
                        [Op.in]: db.sequelize.literal(`(
                            SELECT id 
                            FROM benchmark_vessel_inspections 
                            WHERE benchmark_id = ${benchmarkId}
                        )`)
                    }
                },
                transaction
            });

            // Delete Vessel Inspections
            await BenchmarkInspections.destroy({
                where: { benchmark_id: benchmarkId },
                transaction
            });

            // 2. **RECREATE** new dependent records (Logic mirrors createBenchMark)

            // --- 2.1 Recreate 'benchmark_vessel_inspections' table (totalInspections count) ---
            const vesselInspectionData = [];
            for (let i = 0; i < totalInspections; i++) {
                vesselInspectionData.push({
                    user_id: currentUserId,
                    benchmark_id: benchmarkId,
                    report_date: reportDate || existingBenchmark.report_date, // Use new or existing report date
                    created_by: existingBenchmark.created_by, // Keep original creator
                    updated_by: currentUserId
                });
            }

            const vesselInspections = await BenchmarkInspections.bulkCreate(vesselInspectionData, { transaction });
            const firstBenchmarkInspectionId = vesselInspections[0].id; // Link all questions to the first new entry

            // --- 2.2 Recreate 'benchmark_inspection_questions' table ---
            const questionRecords = inspectionDetails.map(detail => ({
                benchmark_inspection_id: firstBenchmarkInspectionId,
                chapter_no: detail.chapterNo,
                viq: detail.viq,
                tag: detail.tag,
                created_by: existingBenchmark.created_by,
                updated_by: currentUserId
            }));

            const questions = await BenchmarkQuestions.bulkCreate(questionRecords, { transaction });

            // --- 2.3 Recreate 'benchmark_inspection_scores' table ---
            const scoreRecords = [];
            questions.forEach((question, index) => {
                const detail = inspectionDetails[index];
                if (detail.negativeEntries && Array.isArray(detail.negativeEntries)) {
                    detail.negativeEntries.forEach(score => {
                        scoreRecords.push({
                            benchmark_question_id: question.id,
                            category: score.category,
                            isNegative: score.isNegative && ['yes', 'no'].includes(score.isNegative) ? score.isNegative : "yes",
                            created_by: existingBenchmark.created_by,
                            updated_by: currentUserId
                        });
                    });
                }
            });

            await BenchmarkScores.bulkCreate(scoreRecords, { transaction });
        }

        // Commit the transaction
        await transaction.commit();

        res.status(200).send({
            message: `Benchmark ${benchmarkId} updated successfully`
        });

    } catch (error) {
        // Rollback on any failure
        await transaction.rollback();
        console.error(`Error updating benchmark ${benchmarkId}:`, error);
        res.status(500).send({
            message: "Error updating benchmark",
            error: error.message
        });
    }
};

const deleteBenchmark = async (req, res) => {
    try {
        const benchmarkId = req.params.id;
        const currentUserId = req.user.id;

        if (!benchmarkId || !currentUserId) {
            return res.status(400).send({ message: "Missing required identifier (Benchmark ID or User ID)." });
        }

        // Find benchmark by ID
        const existingBenchmark = await Benchmark.findByPk(benchmarkId);

        if (!existingBenchmark) {
            return res.status(404).send({ message: `Benchmark with ID ${benchmarkId} not found.` });
        }

        // If already deleted, avoid redundant operation
        if (existingBenchmark.status === "deleted") {
            return res.status(400).send({ message: "Benchmark is already marked as deleted." });
        }

        // Soft delete by updating the status
        await existingBenchmark.update(
            {
                status: "deleted",
                updated_by: currentUserId,
            },
            { where: { id: benchmarkId } }
        );

        return res.status(200).send({
            message: `Benchmark ${benchmarkId} marked as deleted successfully.`,
        });
    } catch (error) {
        console.error("Error deleting benchmark:", error);
        return res.status(500).send({
            message: "Error deleting benchmark",
            error: error.message,
        });
    }
};

module.exports = {
    createBenchMark,
    getBenchmarksByUserId,
    editBenchmark,
    deleteBenchmark,
};
