const getInspectionCounts = async (req, res) => {
    try {
        // Extract date filter parameters from query
        const { dateFilter, startDate, endDate, year } = req.query;
        
        // Build date filter conditions
        let dateCondition = '';
        let dateReplacements = { userId: req.user.id };
        
        if (dateFilter) {
            switch (dateFilter) {
                case 'current_year':
                    dateCondition = 'AND YEAR(vi.report_date) = YEAR(CURDATE())';
                    break;
                    
                case 'previous_year':
                    dateCondition = 'AND YEAR(vi.report_date) = YEAR(CURDATE()) - 1';
                    break;
                    
                case 'specific_year':
                    if (year) {
                        dateCondition = 'AND YEAR(vi.report_date) = :year';
                        dateReplacements.year = year;
                    }
                    break;
                    
                case 'custom_range':
                    if (startDate && endDate) {
                        dateCondition = 'AND DATE(vi.report_date) BETWEEN :startDate AND :endDate';
                        dateReplacements.startDate = startDate;
                        dateReplacements.endDate = endDate;
                    }
                    break;
                    
                case 'last_30_days':
                    dateCondition = 'AND vi.report_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                    break;
                    
                case 'last_90_days':
                    dateCondition = 'AND vi.report_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
                    break;
                    
                case 'last_6_months':
                    dateCondition = 'AND vi.report_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
                    break;
                    
                default:
                    // No date filter applied
                    break;
            }
        }

        // Get overall counts with date filter
        const counts = await sequelize.query(`
            SELECT 
                COUNT(*) as totalObservations,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' THEN 1 ELSE 0 END) as totalPositiveObservations,
                SUM(CASE WHEN is_scores.isWrong = 'yes' THEN 1 ELSE 0 END) as totalWrongObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                ${dateCondition}
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get vessel inspections count (not deleted) with date filter
        const vesselInspectionCount = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM vessel_inspections
            WHERE user_id = :userId 
                AND status != 'deleted'
                ${dateCondition.replace('vi.', '')}
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get risk counts by type with date filter
        const riskCounts = await sequelize.query(`
            SELECT 
                is_scores.risk,
                COUNT(*) as totalRiskCount
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND is_scores.risk IS NOT NULL
                ${dateCondition}
            GROUP BY is_scores.risk
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get counts by category with date filter
        const categoryCounts = await sequelize.query(`
            SELECT 
                is_scores.category,
                COUNT(*) as totalObservations,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' THEN 1 ELSE 0 END) as totalPositiveObservations,
                SUM(CASE WHEN is_scores.isWrong = 'yes' THEN 1 ELSE 0 END) as totalWrongObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND is_scores.category IS NOT NULL
                ${dateCondition}
            GROUP BY is_scores.category
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get counts by tag with date filter
        const tagCounts = await sequelize.query(`
            SELECT 
                iq.tag,
                COUNT(*) as totalObservations,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' THEN 1 ELSE 0 END) as totalPositiveObservations,
                SUM(CASE WHEN is_scores.isWrong = 'yes' THEN 1 ELSE 0 END) as totalWrongObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND iq.tag IS NOT NULL
                ${dateCondition}
            GROUP BY iq.tag
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // NEW QUERY: Get counts by tag and category combination with date filter
        const tagCategoryCounts = await sequelize.query(`
            SELECT 
                iq.tag,
                is_scores.category,
                COUNT(*) as totalObservations,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' THEN 1 ELSE 0 END) as totalPositiveObservations,
                SUM(CASE WHEN is_scores.isWrong = 'yes' THEN 1 ELSE 0 END) as totalWrongObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND iq.tag IS NOT NULL
                AND is_scores.category IS NOT NULL
                ${dateCondition}
            GROUP BY iq.tag, is_scores.category
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get comprehensive chapter data in one query with date filter
        const chapterData = await sequelize.query(`
            SELECT 
                iq.chapter_no,
                is_scores.category,
                COUNT(*) as totalObservations,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' THEN 1 ELSE 0 END) as totalPositiveObservations,
                SUM(CASE WHEN is_scores.isWrong = 'yes' THEN 1 ELSE 0 END) as totalWrongObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND iq.chapter_no IS NOT NULL
                ${dateCondition}
            GROUP BY iq.chapter_no, is_scores.category
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get question counts by chapter and tag with date filter
        const chapterQuestionCounts = await sequelize.query(`
            SELECT 
                iq.chapter_no,
                iq.tag,
                COUNT(DISTINCT iq.id) as questionCount
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND iq.chapter_no IS NOT NULL
                AND iq.tag IS NOT NULL
                ${dateCondition}
            GROUP BY iq.chapter_no, iq.tag
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get vessel-based negative observations with date filter
        const vesselCounts = await sequelize.query(`
            SELECT 
                v.name as vessel_name,
                v.id as vessel_id,
                SUM(CASE WHEN is_scores.isNegative = 'yes' THEN 1 ELSE 0 END) as totalNegativeObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            JOIN vessels v ON vi.vessel_id = v.id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND v.status != 'deleted'
                ${dateCondition}
            GROUP BY v.id, v.name
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get crew position counts using title instead of category with date filter
        const crewPositionCounts = await sequelize.query(`
            SELECT 
                cp.title as title,
                cp.category as crew_category,
                cp.department,
                SUM(CASE WHEN is_scores.isNegative = 'yes' AND is_scores.category = 'human' THEN 1 ELSE 0 END) as totalNegativeObservations,
                SUM(CASE WHEN is_scores.isNegative = 'no' AND is_scores.category = 'human' THEN 1 ELSE 0 END) as totalPositiveObservations
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            JOIN crew_positions cp ON is_scores.crew_id = cp.id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND cp.status = 'active'
                AND is_scores.crew_id IS NOT NULL
                AND is_scores.category = 'human'
                ${dateCondition}
            GROUP BY cp.title, cp.category, cp.department
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get PIF data analysis with date filter
        const pifAnalysis = await sequelize.query(`
            SELECT 
                is_scores.pif,
                is_scores.operator_comments,
                is_scores.isNegative
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND is_scores.pif IS NOT NULL
                AND is_scores.pif != 'null'
                AND is_scores.pif != '[]'
                AND CHAR_LENGTH(is_scores.pif) > 2
                ${dateCondition}
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get PIF data analysis by crew positions with date filter
        const pifAnalysisByCrew = await sequelize.query(`
            SELECT 
                cp.title as crew_title,
                cp.category as crew_category,
                cp.department,
                is_scores.pif,
                is_scores.isNegative
            FROM vessel_inspections vi
            JOIN inspection_questions iq ON vi.id = iq.inspection_id
            JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
            JOIN crew_positions cp ON is_scores.crew_id = cp.id
            WHERE vi.status = 'active' 
                AND vi.user_id = :userId
                AND iq.status = 'active'
                AND is_scores.status = 'active'
                AND cp.status = 'active'
                AND is_scores.crew_id IS NOT NULL
                AND is_scores.pif IS NOT NULL
                AND is_scores.pif != 'null'
                AND is_scores.pif != '[]'
                AND CHAR_LENGTH(is_scores.pif) > 2
                ${dateCondition}
        `, {
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Get TMSA data analysis with date filter
        // const tmsaAnalysis = await sequelize.query(`
        //     SELECT 
        //         is_scores.tmsa,
        //         is_scores.operator_comments,
        //         is_scores.isNegative
        //     FROM vessel_inspections vi
        //     JOIN inspection_questions iq ON vi.id = iq.inspection_id
        //     JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
        //     WHERE vi.status = 'active' 
        //         AND vi.user_id = :userId
        //         AND iq.status = 'active'
        //         AND is_scores.status = 'active'
        //         AND is_scores.tmsa IS NOT NULL
        //         AND is_scores.tmsa != 'null'
        //         AND is_scores.tmsa != '[]'
        //         AND CHAR_LENGTH(is_scores.tmsa) > 2
        //         AND is_scores.isNegative = 'yes'
        //         ${dateCondition}
        // `, {
        //     replacements: dateReplacements,
        //     type: sequelize.QueryTypes.SELECT
        // });

         const tmsaAnalysis = await sequelize.query(`
             SELECT 
                 is_scores.tmsa,
                 is_scores.operator_comments,
                 is_scores.isNegative
             FROM vessel_inspections vi
             JOIN inspection_questions iq ON vi.id = iq.inspection_id
             JOIN inspection_scores is_scores ON iq.id = is_scores.question_id
             WHERE vi.status = 'active' 
                 AND vi.user_id = :userId
                 AND iq.status = 'active'
                 AND is_scores.status = 'active'
                 AND is_scores.tmsa IS NOT NULL
                 AND is_scores.tmsa != 'null'
                 AND is_scores.tmsa != '[]'
                 AND is_scores.isNegative = 'yes'
                 ${dateCondition}
         `, {
             replacements: dateReplacements,
             type: sequelize.QueryTypes.SELECT
         });

        // [Rest of the processing logic remains the same as in your original code]
        const summary = counts[0] || {
            totalObservations: 0,
            totalNegativeObservations: 0,
            totalPositiveObservations: 0,
            totalWrongObservations: 0
        };

        const inspectionCount = parseInt(vesselInspectionCount[0].count) || 0;

        Object.keys(summary).forEach(key => {
            summary[key] = parseInt(summary[key]) || 0;
        });

        // Process risk counts and calculate averages
        const riskBreakdown = {};
        const riskAverages = {};
        
        // Initialize all risk types with 0 counts
        const riskTypes = ['high', 'increased', 'moderate', 'minimal', 'none'];
        riskTypes.forEach(riskType => {
            riskBreakdown[riskType] = {
                totalRiskCount: 0,
                avgRiskCount: 0
            };
            riskAverages[riskType] = 0;
        });

        // Process actual risk data
        riskCounts.forEach(row => {
            const riskType = row.risk;
            const totalCount = parseInt(row.totalRiskCount) || 0;
            const avgCount = parseFloat((totalCount / inspectionCount).toFixed(2));

            riskBreakdown[riskType] = {
                totalRiskCount: totalCount,
                avgRiskCount: avgCount,
                calculation: `Risk observations divided by inspection count (${inspectionCount})`
            };
            riskAverages[riskType] = avgCount;
        });

        const overallAverages = {
            avgTotalObservations: parseFloat((summary.totalObservations / inspectionCount).toFixed(2)),
            avgNegativeObservations: parseFloat((summary.totalNegativeObservations / inspectionCount).toFixed(2)),
            avgPositiveObservations: parseFloat((summary.totalPositiveObservations / inspectionCount).toFixed(2)),
            avgWrongObservations: parseFloat((summary.totalWrongObservations / inspectionCount).toFixed(2)),
            calculation: `Total observations divided by number of inspections (${inspectionCount})`
        };

        const overallAveragesPercentages = {
            percentNegativeObservations: overallAverages.avgTotalObservations > 0 
                ? parseFloat(((overallAverages.avgNegativeObservations / overallAverages.avgTotalObservations) * 100).toFixed(2))
                : 0,
            percentPositiveObservations: overallAverages.avgTotalObservations > 0 
                ? parseFloat(((overallAverages.avgPositiveObservations / overallAverages.avgTotalObservations) * 100).toFixed(2))
                : 0,
            percentWrongObservations: overallAverages.avgTotalObservations > 0 
                ? parseFloat(((overallAverages.avgWrongObservations / overallAverages.avgTotalObservations) * 100).toFixed(2))
                : 0,
                calculation: "Negative/positive/wrong observations divided by total observations × 100"
        };

        const chapterNegativeAverages = {};
        const byChapterNegativeWithPercentages = {};
        const chapterDataGrouped = {};
        chapterData.forEach(row => {
            const chapterNo = row.chapter_no;
            if (!chapterDataGrouped[chapterNo]) {
                chapterDataGrouped[chapterNo] = [];
            }
            chapterDataGrouped[chapterNo].push(row);
        });

        const chapterQuestionCountsGrouped = {};
        chapterQuestionCounts.forEach(row => {
            const chapterNo = row.chapter_no;
            if (!chapterQuestionCountsGrouped[chapterNo]) {
                chapterQuestionCountsGrouped[chapterNo] = [];
            }
            chapterQuestionCountsGrouped[chapterNo].push(row);
        });

        Object.keys(chapterDataGrouped).forEach(chapterNo => {
            const chapterKey = `chapter_${chapterNo}`;
            const chapterRows = chapterDataGrouped[chapterNo];
            
            let chapterTotals = {
                totalNegativeObservations: 0,
            };
            
            chapterRows.forEach(row => {
                chapterTotals.totalNegativeObservations += parseInt(row.totalNegativeObservations) || 0;
            });

            if (chapterNo !== '1') {
                const avgNegativePerInspection = parseFloat((chapterTotals.totalNegativeObservations / inspectionCount).toFixed(2));
                chapterNegativeAverages[chapterKey] = avgNegativePerInspection;
            }

            byChapterNegativeWithPercentages[chapterKey] = {};
            
            let coreQuestionCount = 0;
            let rotational1QuestionCount = 0;
            let rotational2QuestionCount = 0;
            const categoryBreakdownForChapter = {};

            const questionCountsForChapter = chapterQuestionCountsGrouped[chapterNo] || [];
            questionCountsForChapter.forEach(row => {
                const tag = row.tag.toLowerCase();
                const questionCount = parseInt(row.questionCount) || 0;
                
                if (tag === 'core') {
                    coreQuestionCount = questionCount;
                } else if (tag === 'rotational 1') {
                    rotational1QuestionCount = questionCount;
                } else if (tag === 'rotational 2') {
                    rotational2QuestionCount = questionCount;
                }
            });

            chapterRows.forEach(row => {
                const category = row.category;
                if (!category) return;
                const negativeObservations = parseInt(row.totalNegativeObservations) || 0;
                categoryBreakdownForChapter[category] = negativeObservations;
            });

            byChapterNegativeWithPercentages[chapterKey] = {
                core: coreQuestionCount,
                'rotational 1': rotational1QuestionCount,
                'rotational 2': rotational2QuestionCount,
                totalNegativeObservations: chapterTotals.totalNegativeObservations,
                category: categoryBreakdownForChapter
            };
        });

        chapterNegativeAverages.calculation = `Chapter negative observations divided by inspection count (${inspectionCount})`;

        const categoryBreakdown = {};
        categoryCounts.forEach(row => {
            const totalObs = parseInt(row.totalObservations) || 0;
            const totalNeg = parseInt(row.totalNegativeObservations) || 0;
            const totalPos = parseInt(row.totalPositiveObservations) || 0;
            const totalWrong = parseInt(row.totalWrongObservations) || 0;

            const avgTotalObs = parseFloat((totalObs / inspectionCount).toFixed(2));
            const avgNegObs = parseFloat((totalNeg / inspectionCount).toFixed(2));
            const avgPosObs = parseFloat((totalPos / inspectionCount).toFixed(2));
            const avgWrongObs = parseFloat((totalWrong / inspectionCount).toFixed(2));

            categoryBreakdown[row.category] = {
                totalObservations: totalObs,
                totalNegativeObservations: totalNeg,
                totalPositiveObservations: totalPos,
                totalWrongObservations: totalWrong,
                averages: {
                    avgTotalObservations: avgTotalObs,
                    avgNegativeObservations: avgNegObs,
                    avgPositiveObservations: avgPosObs,
                    avgWrongObservations: avgWrongObs,
                    calculation: `Category observations divided by inspection count (${inspectionCount})`
                },
                percentages: {
                    percentNegativeObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalNeg / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    percentPositiveObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalPos / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    percentWrongObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalWrong / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    calculation: "Category observations divided by total observations × 100"
                }
            };
        });

        const tagBreakdown = {};
        tagCounts.forEach(row => {
            const totalObs = parseInt(row.totalObservations) || 0;
            const totalNeg = parseInt(row.totalNegativeObservations) || 0;
            const totalPos = parseInt(row.totalPositiveObservations) || 0;
            const totalWrong = parseInt(row.totalWrongObservations) || 0;

            const avgTotalObs = parseFloat((totalObs / inspectionCount).toFixed(2));
            const avgNegObs = parseFloat((totalNeg / inspectionCount).toFixed(2));
            const avgPosObs = parseFloat((totalPos / inspectionCount).toFixed(2));
            const avgWrongObs = parseFloat((totalWrong / inspectionCount).toFixed(2));

            tagBreakdown[row.tag] = {
                totalObservations: totalObs,
                totalNegativeObservations: totalNeg,
                totalPositiveObservations: totalPos,
                totalWrongObservations: totalWrong,
                averages: {
                    avgTotalObservations: avgTotalObs,
                    avgNegativeObservations: avgNegObs,
                    avgPositiveObservations: avgPosObs,
                    avgWrongObservations: avgWrongObs,
                    calculation: `Question type observations divided by inspection count (${inspectionCount})`
                },
                percentages: {
                    percentNegativeObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalNeg / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    percentPositiveObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalPos / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    percentWrongObservations: summary.totalObservations > 0 
                        ? parseFloat(((totalWrong / summary.totalObservations) * 100).toFixed(2))
                        : 0,
                    calculation: "Question type observations divided by total of tag observations × 100"
                }
            };
        });

        // NEW PROCESSING: Add category averages for each tag
        const tagCategoryBreakdown = {};
        tagCategoryCounts.forEach(row => {
            const tag = row.tag;
            const category = row.category;
            const totalObs = parseInt(row.totalObservations) || 0;
            const totalNeg = parseInt(row.totalNegativeObservations) || 0;
            const totalPos = parseInt(row.totalPositiveObservations) || 0;
            const totalWrong = parseInt(row.totalWrongObservations) || 0;

            const avgTotalObs = parseFloat((totalObs / inspectionCount).toFixed(2));
            const avgNegObs = parseFloat((totalNeg / inspectionCount).toFixed(2));
            const avgPosObs = parseFloat((totalPos / inspectionCount).toFixed(2));
            const avgWrongObs = parseFloat((totalWrong / inspectionCount).toFixed(2));

            if (!tagCategoryBreakdown[tag]) {
                tagCategoryBreakdown[tag] = {};
            }

            tagCategoryBreakdown[tag][category] = {
                totalObservations: totalObs,
                totalNegativeObservations: totalNeg,
                totalPositiveObservations: totalPos,
                totalWrongObservations: totalWrong,
                averages: {
                    avgTotalObservations: avgTotalObs,
                    avgNegativeObservations: avgNegObs,
                    avgPositiveObservations: avgPosObs,
                    avgWrongObservations: avgWrongObs,
                    calculation: `Question Category observations divided by inspection count (${inspectionCount})`
                }
            };
        });

        // Add the category averages to the existing tagBreakdown
        Object.keys(tagBreakdown).forEach(tag => {
            if (tagCategoryBreakdown[tag]) {
                tagBreakdown[tag].categoryAverages = tagCategoryBreakdown[tag];
            } else {
                tagBreakdown[tag].categoryAverages = {};
            }
        });

        const vesselBreakdown = {};
        vesselCounts.forEach(row => {
            const totalNegativeObservations = parseInt(row.totalNegativeObservations) || 0;
            const avgNegativeObservations = parseFloat((totalNegativeObservations / inspectionCount).toFixed(2));

            vesselBreakdown[row.vessel_name] = {
                vessel_id: row.vessel_id,
                totalNegativeObservations: totalNegativeObservations,
                avgNegativeObservations: avgNegativeObservations,
                calculation: `Vessel negative observations divided by inspection count (${inspectionCount})`
            };
        });

        // Crew averages with custom groupings
        const crewDataByTitle = {};
        const crewDataByCategory = {};
        const crewDataByDepartment = {
            deck: { totalPositive: 0, totalNegative: 0 },
            engine: { totalPositive: 0, totalNegative: 0 }
        };

        crewPositionCounts.forEach(row => {
            const totalNeg = parseInt(row.totalNegativeObservations) || 0;
            const totalPos = parseInt(row.totalPositiveObservations) || 0;
            const department = row.department;
            const category = row.crew_category;
            const title = row.title;

            const avgNegObs = parseFloat((totalNeg / inspectionCount).toFixed(2));
            const avgPosObs = parseFloat((totalPos / inspectionCount).toFixed(2));

            // Store by title
            crewDataByTitle[title] = {
                positive: avgPosObs,
                negative: avgNegObs
            };

            // Store by category
            if (!crewDataByCategory[category]) {
                crewDataByCategory[category] = { totalPositive: 0, totalNegative: 0 };
            }
            crewDataByCategory[category].totalPositive += totalPos;
            crewDataByCategory[category].totalNegative += totalNeg;

            // Store by department
            crewDataByDepartment[department].totalPositive += totalPos;
            crewDataByDepartment[department].totalNegative += totalNeg;
        });

        // Calculate category averages
        const categoryAverages = {};
        Object.keys(crewDataByCategory).forEach(category => {
            categoryAverages[category] = {
                positive: parseFloat((crewDataByCategory[category].totalPositive / inspectionCount).toFixed(2)),
                negative: parseFloat((crewDataByCategory[category].totalNegative / inspectionCount).toFixed(2))
            };
        });

        // crewPositiveAverages: deck, engine, senior_officer, senior_engineer, junior_engineer, deck_rating, engine_rating
        const crewPositiveAverages = {
            deck: parseFloat((crewDataByDepartment.deck.totalPositive / inspectionCount).toFixed(2)),
            engine: parseFloat((crewDataByDepartment.engine.totalPositive / inspectionCount).toFixed(2)),
            senior_officer: parseFloat((crewDataByCategory.senior_deck_officer ? crewDataByCategory.senior_deck_officer.totalPositive / inspectionCount : 0).toFixed(2)),
            senior_engineer: parseFloat((crewDataByCategory.senior_engineer ? crewDataByCategory.senior_engineer.totalPositive / inspectionCount : 0).toFixed(2)),
            junior_engineer: parseFloat((crewDataByCategory.junior_engineer ? crewDataByCategory.junior_engineer.totalPositive / inspectionCount : 0).toFixed(2)),
            deck_rating: parseFloat((crewDataByCategory.deck_rating ? crewDataByCategory.deck_rating.totalPositive / inspectionCount : 0).toFixed(2)),
            engine_rating: parseFloat((crewDataByCategory.engine_rating ? crewDataByCategory.engine_rating.totalPositive / inspectionCount : 0).toFixed(2)),
            // calculation: `Crew positive observations divided by inspection count (${inspectionCount})`
        };

        // crewNegativeAverages: master, chief_officer, junior_officers, deck_ratings, chief_engineer, 2nd_engineer, junior_engineers, engine_ratings
        const crewNegativeAverages = {
            master: crewDataByTitle.Master ? crewDataByTitle.Master.negative : 0,
            chief_officer: crewDataByTitle['Chief Officer'] ? crewDataByTitle['Chief Officer'].negative : 0,
            junior_officers: parseFloat((crewDataByCategory.junior_deck_officer ? crewDataByCategory.junior_deck_officer.totalNegative / inspectionCount : 0).toFixed(2)),
            deck_ratings: parseFloat((crewDataByCategory.deck_rating ? crewDataByCategory.deck_rating.totalNegative / inspectionCount : 0).toFixed(2)),
            chief_engineer: crewDataByTitle['Chief Engineer'] ? crewDataByTitle['Chief Engineer'].negative : 0,
            '2nd_engineer': crewDataByTitle['2nd Engineer'] ? crewDataByTitle['2nd Engineer'].negative : 0,
            junior_engineers: parseFloat((crewDataByCategory.junior_engineer ? crewDataByCategory.junior_engineer.totalNegative / inspectionCount : 0).toFixed(2)),
            engine_ratings: parseFloat((crewDataByCategory.engine_rating ? crewDataByCategory.engine_rating.totalNegative / inspectionCount : 0).toFixed(2)),
            // calculation: `Crew negative observations divided by inspection count (${inspectionCount})`
        };

        const departmentTotals = {
            deck: { totalPositive: 0, totalNegative: 0 },
            engine: { totalPositive: 0, totalNegative: 0 }
        };

        crewPositionCounts.forEach(row => {
            const totalNeg = parseInt(row.totalNegativeObservations) || 0;
            const totalPos = parseInt(row.totalPositiveObservations) || 0;
            const department = row.department;

            if (departmentTotals[department]) {
                departmentTotals[department].totalPositive += totalPos;
                departmentTotals[department].totalNegative += totalNeg;
            }
        });

        // cumulativeHumans: sum of both positive AND negative observations
        const cumulativeHumans = {
            calculation: "Sum of positive and negative crew observations divided by inspection count",
            deck: {
                avgTotalObservations: parseFloat(((crewDataByDepartment.deck.totalPositive + crewDataByDepartment.deck.totalNegative) / inspectionCount).toFixed(2)),
                avgPositiveObservations: parseFloat((crewDataByDepartment.deck.totalPositive / inspectionCount).toFixed(2)),
                avgNegativeObservations: parseFloat((crewDataByDepartment.deck.totalNegative / inspectionCount).toFixed(2)),
                
            },
            engine: {
                avgTotalObservations: parseFloat(((crewDataByDepartment.engine.totalPositive + crewDataByDepartment.engine.totalNegative) / inspectionCount).toFixed(2)),
                avgPositiveObservations: parseFloat((crewDataByDepartment.engine.totalPositive / inspectionCount).toFixed(2)),
                avgNegativeObservations: parseFloat((crewDataByDepartment.engine.totalNegative / inspectionCount).toFixed(2))
            },
            senior_officer: {
                avgTotalObservations: parseFloat((((crewDataByCategory.senior_deck_officer ? crewDataByCategory.senior_deck_officer.totalPositive + crewDataByCategory.senior_deck_officer.totalNegative : 0) + 
                                                  (crewDataByCategory.senior_engineer ? crewDataByCategory.senior_engineer.totalPositive + crewDataByCategory.senior_engineer.totalNegative : 0)) / inspectionCount).toFixed(2)),
                avgPositiveObservations: parseFloat((((crewDataByCategory.senior_deck_officer ? crewDataByCategory.senior_deck_officer.totalPositive : 0) + 
                                                     (crewDataByCategory.senior_engineer ? crewDataByCategory.senior_engineer.totalPositive : 0)) / inspectionCount).toFixed(2)),
                avgNegativeObservations: parseFloat((((crewDataByCategory.senior_deck_officer ? crewDataByCategory.senior_deck_officer.totalNegative : 0) + 
                                                     (crewDataByCategory.senior_engineer ? crewDataByCategory.senior_engineer.totalNegative : 0)) / inspectionCount).toFixed(2))
            },
            junior_officer: {
                avgTotalObservations: parseFloat((((crewDataByCategory.junior_deck_officer ? crewDataByCategory.junior_deck_officer.totalPositive + crewDataByCategory.junior_deck_officer.totalNegative : 0) + 
                                                  (crewDataByCategory.junior_engineer ? crewDataByCategory.junior_engineer.totalPositive + crewDataByCategory.junior_engineer.totalNegative : 0)) / inspectionCount).toFixed(2)),
                avgPositiveObservations: parseFloat((((crewDataByCategory.junior_deck_officer ? crewDataByCategory.junior_deck_officer.totalPositive : 0) + 
                                                     (crewDataByCategory.junior_engineer ? crewDataByCategory.junior_engineer.totalPositive : 0)) / inspectionCount).toFixed(2)),
                avgNegativeObservations: parseFloat((((crewDataByCategory.junior_deck_officer ? crewDataByCategory.junior_deck_officer.totalNegative : 0) + 
                                                     (crewDataByCategory.junior_engineer ? crewDataByCategory.junior_engineer.totalNegative : 0)) / inspectionCount).toFixed(2))
            },
            ratings: {
                avgTotalObservations: parseFloat((((crewDataByCategory.deck_rating ? crewDataByCategory.deck_rating.totalPositive + crewDataByCategory.deck_rating.totalNegative : 0) + 
                                                  (crewDataByCategory.engine_rating ? crewDataByCategory.engine_rating.totalPositive + crewDataByCategory.engine_rating.totalNegative : 0)) / inspectionCount).toFixed(2)),
                avgPositiveObservations: parseFloat((((crewDataByCategory.deck_rating ? crewDataByCategory.deck_rating.totalPositive : 0) + 
                                                     (crewDataByCategory.engine_rating ? crewDataByCategory.engine_rating.totalPositive : 0)) / inspectionCount).toFixed(2)),
                avgNegativeObservations: parseFloat((((crewDataByCategory.deck_rating ? crewDataByCategory.deck_rating.totalNegative : 0) + 
                                                     (crewDataByCategory.engine_rating ? crewDataByCategory.engine_rating.totalNegative : 0)) / inspectionCount).toFixed(2))
            }
        };

        const totalNegAcrossChapters = Object.values(byChapterNegativeWithPercentages)
            .reduce((sum, chapter) => sum + (chapter.totalNegativeObservations || 0), 0);

        Object.entries(byChapterNegativeWithPercentages).forEach(([chapterKey, chapterData]) => {
            chapterData.percentNegativeObservations = totalNegAcrossChapters > 0 
                ? parseFloat(((chapterData.totalNegativeObservations / totalNegAcrossChapters) * 100).toFixed(2))
                : 0;
                chapterData.calculation = "Chapter negative observations divided by total negative observations across all chapters × 100";
        });

        // Count each pifNumber occurrence separated by isNegative
        const pifCounts = {};
        const pifDescriptions = {};
        let totalPifNumbers = 0;
        let totalNegativePifNumbers = 0;
        let totalPositivePifNumbers = 0;

        pifAnalysis.forEach(row => {
            try {
                const pifArray = typeof row.pif === 'string' ? JSON.parse(row.pif) : row.pif;
                const isNegative = row.isNegative === 'yes';
                
                 if (Array.isArray(pifArray)) {
                pifArray.forEach(pifItem => {
                    const pifNumber = pifItem.pifNumber;
                    const pifDescription = pifItem.pifDescription;
                    
                    // Store unique description
                    if (!pifDescriptions[pifNumber]) {
                        pifDescriptions[pifNumber] = pifDescription;
                    }
                    
                    // Initialize counts for this pifNumber
                    if (!pifCounts[pifNumber]) {
                        pifCounts[pifNumber] = {
                            total: 0,
                            negative: 0,
                            positive: 0
                        };
                    }
                    
                    // Count occurrences
                    pifCounts[pifNumber].total++;
                    totalPifNumbers++;
                    
                    if (isNegative) {
                        pifCounts[pifNumber].negative++;
                        totalNegativePifNumbers++;
                    } else {
                        pifCounts[pifNumber].positive++;
                        totalPositivePifNumbers++;
                    }
                });
            }
            } catch (e) {
                console.log('Error parsing PIF JSON:', e);
            }
        });

        // Calculate percentages for each pifNumber
        const pifBreakdown = {};
        Object.keys(pifCounts).forEach(pifNumber => {
            const counts = pifCounts[pifNumber];
            
            // Percentage of negative pifNumbers
            const negativePercentage = totalNegativePifNumbers > 0 
                ? parseFloat(((counts.negative / totalNegativePifNumbers) * 100).toFixed(2))
                : 0;
            
            // Percentage of positive pifNumbers
            const positivePercentage = totalPositivePifNumbers > 0 
                ? parseFloat(((counts.positive / totalPositivePifNumbers) * 100).toFixed(2))
                : 0;
            
            pifBreakdown[`pif_${pifNumber}`] = {
                pifNumber: pifNumber,
                pifDescription: pifDescriptions[pifNumber],
                counts: {
                    total: counts.total,
                    negative: counts.negative,
                    positive: counts.positive
                },
                percentages: {
                    negativePercentage: negativePercentage, 
                    positivePercentage: positivePercentage,
                    calculation: "PIF occurrences divided by total negative/positive PIF numbers × 100"
                }
            };
        });

        // Process PIF data by crew positions
        const pifCrewAverages = {};

        pifAnalysisByCrew.forEach(row => {
            try {
                const pifArray = typeof row.pif === 'string' ? JSON.parse(row.pif) : row.pif;
                const crewTitle = row.crew_title;
                const crewCategory = row.crew_category;
                
                // Map crew titles to our desired categories
                let crewGroup = null;
                if (crewTitle === 'Master') {
                    crewGroup = 'master';
                } else if (crewTitle === 'Chief Officer') {
                    crewGroup = 'chief_officer';
                } else if (crewCategory === 'junior_deck_officer') {
                    crewGroup = 'junior_officers';
                } else if (crewCategory === 'deck_rating') {
                    crewGroup = 'deck_ratings';
                } else if (crewTitle === 'Chief Engineer') {
                    crewGroup = 'chief_engineer';
                } else if (crewTitle === '2nd Engineer') {
                    crewGroup = '2nd_engineer';
                } else if (crewCategory === 'junior_engineer') {
                    crewGroup = 'junior_engineers';
                } else if (crewCategory === 'engine_rating') {
                    crewGroup = 'engine_ratings';
                }
                
                if (crewGroup && Array.isArray(pifArray)) {
                    pifArray.forEach(pifItem => {
                        const pifNumber = pifItem.pifNumber;
                        const pifDescription = pifItem.pifDescription;
                        
                        // Initialize PIF entry if it doesn't exist
                        if (!pifCrewAverages[pifDescription]) {
                            pifCrewAverages[pifDescription] = {
                                pifNumber: pifNumber,
                                ranks: {}
                            };
                        }
                        
                        // Initialize rank count for this PIF if it doesn't exist
                        if (!pifCrewAverages[pifDescription].ranks[crewGroup]) {
                            pifCrewAverages[pifDescription].ranks[crewGroup] = 0;
                        }
                        
                        // Count occurrences
                        pifCrewAverages[pifDescription].ranks[crewGroup]++;
                    });
                }
            } catch (e) {
                console.log('Error parsing PIF JSON for crew analysis:', e);
            }
        });

        // Calculate averages (divide by inspection count)
        Object.keys(pifCrewAverages).forEach(pifDescription => {
            Object.keys(pifCrewAverages[pifDescription].ranks).forEach(rank => {
                const count = pifCrewAverages[pifDescription].ranks[rank];
                pifCrewAverages[pifDescription].ranks[rank] = parseFloat((count / inspectionCount).toFixed(2));
            });
            pifCrewAverages[pifDescription].calculation = `PIF occurrences by crew position divided by inspection count (${inspectionCount})`;
        });
        
        // Process TMSA data - count each TMSA occurrence (only neg)
        const tmsaCounts = {};
        let totalNegativeTmsaCodes = 0;

        tmsaAnalysis.forEach(row => {
            const tmsaCode = row.tmsa; // TMSA is a string, not JSON
            
            if (tmsaCode && tmsaCode.trim() !== '') {
                // Initialize counts for this TMSA code
                if (!tmsaCounts[tmsaCode]) {
                    tmsaCounts[tmsaCode] = 0;
                }
                
                // Count occurrences (only negative)
                tmsaCounts[tmsaCode]++;
                totalNegativeTmsaCodes++;
            }
        });

        // Calculate averages for each TMSA code (count divided by total observations)
        const tmsaBreakdown = {};
        Object.keys(tmsaCounts).forEach(tmsaCode => {
            const count = tmsaCounts[tmsaCode];
            
            // Average = TMSA count / total observations (not inspections)
            const average = summary.totalObservations > 0 
                ? parseFloat((count / summary.totalObservations).toFixed(4))
                : 0;
            
            tmsaBreakdown[`tmsa_${tmsaCode.replace(/\./g, '_')}`] = {
                tmsaCode: tmsaCode,
                count: count,
                average: average,
                calculation: `TMSA code occurrences divided by total observations (${summary.totalObservations})`
            };
        });

        // Add summary totals
        const tmsaSummary = {
            totalNegativeTmsaCodes: totalNegativeTmsaCodes,
            uniqueTmsaCodes: Object.keys(tmsaCounts).length,
            averageTmsaPerInspection: parseFloat((totalNegativeTmsaCodes / inspectionCount).toFixed(2)),
            calculation: `Total TMSA codes divided by inspection count (${inspectionCount})`
        };

        // Get date range info for response
        let appliedDateRange = 'All time';
        if (dateFilter) {
            switch (dateFilter) {
                case 'current_year':
                    appliedDateRange = 'Current year';
                    break;
                case 'previous_year':
                    appliedDateRange = 'Previous year';
                    break;
                case 'specific_year':
                    appliedDateRange = year ? `Year ${year}` : 'All time';
                    break;
                case 'custom_range':
                    appliedDateRange = startDate && endDate ? `${startDate} to ${endDate}` : 'All time';
                    break;
                case 'last_30_days':
                    appliedDateRange = 'Last 30 days';
                    break;
                case 'last_90_days':
                    appliedDateRange = 'Last 90 days';
                    break;
                case 'last_6_months':
                    appliedDateRange = 'Last 6 months';
                    break;
            }
        }

        const result = {
            dateRange: appliedDateRange,
            dateFilter: {
                type: dateFilter || 'none',
                startDate: startDate || null,
                endDate: endDate || null,
                year: year || null
            },
            overall: summary,
            overallAverages: overallAverages,
            overallAveragesPercentages: overallAveragesPercentages,
            chapterNegativeAverages: chapterNegativeAverages,
            byChapterNegativeOnlyWithPercent: byChapterNegativeWithPercentages,
            vesselInspectionCount: inspectionCount,
            byCategory: categoryBreakdown,
            byTag: tagBreakdown,
            byVessel: vesselBreakdown,
            crewPositiveAverages: crewPositiveAverages,  
            crewNegativeAverages: crewNegativeAverages, 
            cumulativeHumans: cumulativeHumans,
            riskBreakdown: riskBreakdown,  
            riskAverages: riskAverages,
            byPIF: pifBreakdown,
            pifByCrewPosition: pifCrewAverages,
            byTMSA: tmsaBreakdown,       
            tmsaSummary: tmsaSummary  
        };

        res.status(200).json({
            message: "success",
            success: true,
            userId: req.user.id,
            data: result
        });
        
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message
        });
    }
};