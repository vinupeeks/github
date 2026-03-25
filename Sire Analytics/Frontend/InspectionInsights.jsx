import React, { useRef, useEffect } from "react";
import Chart from "react-apexcharts";
import InlineExpandableInfo from "../../components/InlineExpandableInfo";
import GraphNotesManager from "./ChartFunctions/GraphNotesManager";
import { useDispatch, useSelector } from "react-redux";
import { addChartForPdf } from "../../redux/reducers/dataReducers";

const InspectionInsights = ({ byCategory = {}, byTag = {}, overall = {}, allNotesData, notesLoading }) => {
    const dispatch = useDispatch();
    const chartsComments = useSelector((state) => state.data.chartsComments);
    const user = useSelector((state) => state.auth.user);

    // ---------- REFS FOR ALL CHARTS ----------
    const obsPerCoreRef = useRef(null);
    const obsPerCategoryRef = useRef(null);
    const wrongObsRef = useRef(null);
    const wrongObsCategoryRef = useRef(null);
    const coreBreakdownRef = useRef(null);
    const rotational1Ref = useRef(null);
    const rotational2Ref = useRef(null);

    // ---------- DATA PROCESSING ----------
    const observationsPerCore = [
        { name: "Core", value: byTag?.Core?.averages.avgNegativeObservations || 0 },
        { name: "Rotational 1", value: byTag?.["Rotational 1"]?.averages.avgNegativeObservations || 0 },
        { name: "Rotational 2", value: byTag?.["Rotational 2"]?.averages.avgNegativeObservations || 0 }
    ];
    
    const CATEGORY_COLORS = {
        Human: "#39a2ed",
        Hardware: "#e76565",
        Process: "#f3a35d",
        Photo: "#85ef85"
    };
    const TYPE_COLORS = {
        'Core': "#39a2ed",
        'Rotational 1': "#e76565",
        'Rotational 2': "#f3a35d",
    };

    const observationsPerCategory = Object.entries(byCategory).map(([name, data]) => ({
        name,
        value: data.averages.avgNegativeObservations
    }));

    const wrongObsPercentages = {
        Core: byTag?.Core?.averages.avgNegativeObservations || 0,
        "Rotational 1": byTag?.["Rotational 1"]?.averages.avgNegativeObservations || 0,
        "Rotational 2": byTag?.["Rotational 2"]?.averages.avgNegativeObservations || 0
    };

    const coreBreakdown = {
        Human: byTag?.Core?.categoryAverages?.human?.averages?.avgNegativeObservations || 0,
        Hardware: byTag?.Core?.categoryAverages?.hardware?.averages?.avgNegativeObservations || 0,
        Process: byTag?.Core?.categoryAverages?.process?.averages?.avgNegativeObservations || 0,
        Photo: byTag?.Core?.categoryAverages?.photo?.averages?.avgNegativeObservations || 0
    };

    const rotational1Breakdown = {
        Human: byTag?.["Rotational 1"]?.categoryAverages?.human?.averages?.avgNegativeObservations || 0,
        Hardware: byTag?.["Rotational 1"]?.categoryAverages?.hardware?.averages?.avgNegativeObservations || 0,
        Process: byTag?.["Rotational 1"]?.categoryAverages?.process?.averages?.avgNegativeObservations || 0,
        Photo: byTag?.["Rotational 1"]?.categoryAverages?.photo?.averages?.avgNegativeObservations || 0
    };

    const rotational2Breakdown = {
        Human: byTag?.["Rotational 2"]?.categoryAverages?.human?.averages?.avgNegativeObservations || 0,
        Hardware: byTag?.["Rotational 2"]?.categoryAverages?.hardware?.averages?.avgNegativeObservations || 0,
        Process: byTag?.["Rotational 2"]?.categoryAverages?.process?.averages?.avgNegativeObservations || 0,
        Photo: byTag?.["Rotational 2"]?.categoryAverages?.photo?.averages?.avgNegativeObservations || 0
    };

    const getPieChartConfig = (labels, series) => ({
        options: {
            labels,
            legend: { position: "bottom" },
            dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(2)}%`, offsetY: 12, style: { fontSize: '18px', fontWeight: 'semibold', colors: ["#000"] } },
        },
        series
    });

    const getPieChartTagConfig = (labels, series) => ({
        options: {
            labels,
            colors: labels.map(label => TYPE_COLORS[label] || "#999"),
            legend: { position: "bottom" },
            dataLabels: {
                enabled: true,
                formatter: (val) => `${val.toFixed(2)}%`,
                style: {
                    fontSize: "18px",
                    fontWeight: "semibold",
                    colors: ["#000"]
                }
            }
        },
        series
    });

    const getPieChartTypeConfig = (labels, series) => ({
        options: {
            labels,
            // Force the label to match the Keys in CATEGORY_COLORS (e.g., 'human' becomes 'Human')
            colors: labels.map(label => {
                const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
                return CATEGORY_COLORS[formattedLabel] || "#999";
            }),
            legend: { position: "bottom" },
            dataLabels: {
                enabled: true,
                formatter: (val) => `${val.toFixed(2)}%`,
                style: {
                    fontSize: "18px",
                    fontWeight: "semibold",
                    colors: ["#000"]
                }
            },
        },
        series
    });

    const getBarChartConfig = (categories, seriesData, title, color = "#1E88E5") => ({
        options: {
            chart: { type: "bar", toolbar: { show: false } },
            plotOptions: {
                bar: { borderRadius: 4, columnWidth: "50%", borderRadiusApplication: "end" }
            },
            // dataLabels: { enabled: true, formatter: (val) => val.toFixed(2) },
            dataLabels: { enabled: true, formatter: (val) => val.toFixed(2), offsetY: -25, style: { fontSize: '18px', fontWeight: 'bold', colors: ["#333"] } },
            xaxis: { categories },
            colors: [color],
            legend: { show: false },
            title: {
                text: title,
                align: "center",
                style: { fontSize: "14px", fontWeight: "bold" }
            },
            grid: { show: false },
        },
        series: [{ name: "Average Count", data: seriesData }]
    });

    const { totalObservations = 0, totalWrongObservations = 0 } = overall;
    const wrongPercentage = totalObservations > 0
        ? ((totalWrongObservations / totalObservations) * 100).toFixed(1)
        : 0;

    // ---------- CAPTURE & DISPATCH ----------
useEffect(() => {
  const captureAndDispatch = () => {
    const getComment = (name) => {
      const match = chartsComments.find((c) => c.name === name);
      return match ? match.note : null;
    };

    const captureChart = (ref, id, title, commentName, name) => {
      if (ref.current) {
        const svg = ref.current.querySelector("svg")?.outerHTML;
        if (svg) {
          const comment = commentName ? getComment(commentName) : null;
          const payload = {
            id,
            title,
            svg,
            name
          };

        //   if (comment) {
        //     payload.comments = comment;
        //   }
          dispatch(addChartForPdf(payload));
        }
      }
    };

    captureChart(obsPerCoreRef, 3, "Average Obs per Question Type", "", "avg_obs_per_question_type");
    captureChart(wrongObsRef, 4, "Average Obs by type (percent)", "avg_obs_per_question_type", "avg_obs_per_question_type");
    captureChart(obsPerCategoryRef, 5, "Average Obs per Category", "", "avg_obs_per_question_category");
    captureChart(wrongObsCategoryRef, 6, "Average Obs by Category (percent)", "avg_obs_per_question_category", "avg_obs_per_question_category");
    captureChart(coreBreakdownRef, 7, "Core - Avg Observations", "ques_type_with_category", "ques_type_with_category");
    captureChart(rotational1Ref, 8, "Rotational 1 - Avg Observations", "ques_type_with_category", "ques_type_with_category");
    captureChart(rotational2Ref, 9, "Rotational 2 - Avg Observations", "ques_type_with_category", "ques_type_with_category");
  };

  const timer = setTimeout(captureAndDispatch, 3000);
  return () => clearTimeout(timer);
}, [dispatch, byTag, byCategory, overall, chartsComments]);


    return (
        <div className="flex flex-col gap-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow text-start">
                <p className="text-gray-800 text-sm md:text-base">
                    <span className="font-bold">Marked as wrong - </span>
                    <span className="font-semibold text-blue-600">{totalWrongObservations}</span> out of
                    <span className="font-semibold text-blue-600"> {totalObservations}</span> observations were erroneously raised by the inspectors,
                    the percentage is <span className="font-bold text-blue-600">{wrongPercentage}%</span>.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Obs per Core */}
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                            <h3 className="text-base font-semibold text-gray-800 text-center">
                                Average Observations per Question Type
                            </h3>
                            <InlineExpandableInfo explanation={[byTag?.Core?.averages?.calculation]} />
                        </div>
                        <div className="p-3" ref={obsPerCoreRef}>
                            <Chart
                                {...getBarChartConfig(
                                    observationsPerCore.map((item) => item.name),
                                    observationsPerCore.map((item) => item.value),
                                    "",
                                    "#4CAF50"
                                )}
                                type="bar"
                                height={300}
                            />
                        </div>
                    </div>

                    {/* Obs per Category */}
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                            <h3 className="text-base font-semibold text-gray-800 text-center">
                                Average Observations per Category
                            </h3>
                            <InlineExpandableInfo explanation={[byCategory?.hardware?.averages?.calculation]} />
                        </div>
                        <div className="p-3" ref={obsPerCategoryRef}>
                            <Chart
                                {...getBarChartConfig(
                                    observationsPerCategory.map((item) => item.name),
                                    observationsPerCategory.map((item) => item.value),
                                    "",
                                    "#1E88E5"
                                )}
                                type="bar"
                                height={300}
                            />
                        </div>
                    </div>
                </div>

                {/* Pie Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h3 className="text-lg font-semibold text-center mb-4">Average Observations per Question Type</h3>
                        <div  ref={wrongObsRef}>
                        <Chart {...getPieChartTagConfig(Object.keys(wrongObsPercentages), Object.values(wrongObsPercentages))} type="pie" height={300} /></div>
                        <GraphNotesManager graphName="avg_obs_per_question_type" displayName="Question Type" allNotesData={allNotesData} notesLoading={notesLoading}/>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow">
                        <h3 className="text-lg font-semibold text-center mb-4">Average Observations per Category</h3>
                        <div ref={wrongObsCategoryRef}>
                        <Chart
                            {...getPieChartTypeConfig(
                                observationsPerCategory.map((item) => item.name),
                                observationsPerCategory.map((item) => item.value)
                            )}
                            type="pie"
                            height={300}
                        /></div>
                        <GraphNotesManager graphName="avg_obs_per_question_category" displayName="Question Category" allNotesData={allNotesData} notesLoading={notesLoading} />
                    </div>
                </div>

                {/* Core / Rotational Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h4 className="text-md font-semibold text-center mb-4">Total Core Questions - Avg Observations</h4>
                        <div ref={coreBreakdownRef}>
                        <Chart {...getPieChartTypeConfig(Object.keys(coreBreakdown), Object.values(coreBreakdown))} type="pie" height={250} /></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h4 className="text-md font-semibold text-center mb-4">Total Rotational 1 - Avg Observations</h4>
                        <div ref={rotational1Ref}>
                        <Chart {...getPieChartTypeConfig(Object.keys(rotational1Breakdown), Object.values(rotational1Breakdown))} type="pie" height={250} /></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h4 className="text-md font-semibold text-center mb-4">Total Rotational 2 - Avg Observations</h4>
                        <div ref={rotational2Ref}>
                        <Chart {...getPieChartTypeConfig(Object.keys(rotational2Breakdown), Object.values(rotational2Breakdown))} type="pie" height={250} /></div>
                    </div>
                </div>
                <GraphNotesManager graphName="ques_type_with_category" displayName="Core, R1 and R2 avg obs" allNotesData={allNotesData} notesLoading={notesLoading}/>
            </div>
        </div>
    );
};

export default InspectionInsights;