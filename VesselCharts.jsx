
import React, { useRef, useEffect, useState, useCallback } from "react";
import Chart from "react-apexcharts";
import { useObservationMutation } from "../../redux/services/inspectionApi";
import GraphNotesManager from "./ChartFunctions/GraphNotesManager";
import InspectionInsights from "./InspectionInsights";
import ChaptersChart from "./ChaptersChart";
import ChapterCoreRT from "./ChapterCoreRT";
import ChapterCategory from "./ChapterCategory";
import PositiveNegativeTMSA from "./PositiveNegativeTMSA";
import HumanObservationCharts from "./HumanObservationCharts";
import RiskRatingChart from "./RiskRatingChart";
import FleetOverviewChart from "./FleetOverviewChart";
import PIFPerRankChart from "./PifPerRank";
import InlineExpandableInfo from "../../components/InlineExpandableInfo";
import PdfGenerator from "./ChartFunctions/PdfGenerator";
import { useDispatch, useSelector } from "react-redux";
import { addChartForPdf, clearVettingAnalysisFilterDate, setVettingAnalysisFilterDate, clearChartsComments } from "../../redux/reducers/dataReducers";
import { useGetgraphNotesMutation } from "../../redux/services/graphNotesApi";
import { Upload } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { RouteConstant } from "../../routes/RouteConstant";

const VesselCharts = () => {
  const [getObservation, { data: observationData, isLoading, error }] = useObservationMutation();
  const [getGraphNotes, { data: allNotesData, isLoading: notesLoading }] = useGetgraphNotesMutation();
  const chartsComments = useSelector((state) => state.data.chartsComments);
  const dispatch = useDispatch();
  
  const obs_per_insp_bar = useRef(null);
  const obs_and_obs_insp_bar = useRef(null);
  
   // State for date filtering
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [specificYear, setSpecificYear] = useState("");
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [showYearInput, setShowYearInput] = useState(false);
  const navigate = useNavigate();

  // Date filter options
  const dateFilterOptions = [
    { value: "all", label: "All Time" },
    { value: "current_year", label: "Current Year" },
    { value: "previous_year", label: "Previous Year" },
    { value: "specific_year", label: "Specific Year" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "last_90_days", label: "Last 90 Days" },
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "custom_range", label: "Custom Date Range" }
  ];

  // Function to build query parameters based on selected filter
  const buildQueryParams = () => {
    const params = {};
    
    if (selectedFilter === "all") {
      return params;
    }
    
    params.dateFilter = selectedFilter;
    
    if (selectedFilter === "specific_year" && specificYear) {
      params.year = specificYear;
    }
    
    if (selectedFilter === "custom_range" && customStartDate && customEndDate) {
      params.startDate = customStartDate;
      params.endDate = customEndDate;
    }
    
    return params;
  };

  // Function to call API with filters
  const fetchDataWithFilter = () => {
    const params = buildQueryParams();
    getObservation(params);
  };

  // Initial data fetch
  useEffect(() => {
    fetchDataWithFilter();
    return () => {
      dispatch(clearVettingAnalysisFilterDate(null));
    }
  }, [getObservation]);

  // Handle filter change
  const handleFilterChange = (value) => {
    setSelectedFilter(value);
    setShowCustomInputs(value === "custom_range");
    setShowYearInput(value === "specific_year");
    
    // Reset inputs when changing filter
    if (value !== "custom_range") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
    if (value !== "specific_year") {
      setSpecificYear("");
      dispatch(clearVettingAnalysisFilterDate(null));
    }
  };

  // Handle apply filter button click
  const handleApplyFilter = () => {
    fetchDataWithFilter();
    const rangeText = getDateRangeText(
    selectedFilter,
    customStartDate,
    customEndDate,
    specificYear
  );
  dispatch(setVettingAnalysisFilterDate(rangeText));
  };

  // Handle reset filter
  const handleResetFilter = () => {
    setSelectedFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSpecificYear("");
    dispatch(clearVettingAnalysisFilterDate(null));
    setShowCustomInputs(false);
    setShowYearInput(false);
    // Fetch data without any filters
    getObservation({});
  };

  const {
    overall = {},
    overallAverages = {},
    overallAveragesPercentages = {},
    vesselInspectionCount = 0,
    byCategory = {},
    byTag = {},
    riskAverages = {},
    chapterNegativeAverages = {},
    byChapterNegativeOnlyWithPercent = {},
    byVessel = {},
    cumulativeHumans = {},
    crewPositiveAverages = {},
    crewNegativeAverages = {},
    departmentAverages = {},
    byPIF = {},
    byTMSA = {},
    pifByCrewPosition = {},
    dateRange = "All time",
    riskBreakdown = {},
    } = observationData?.data || {};

// Memoized function to update PDF data with latest charts and comments
const updatePdfWithLatestData = useCallback(() => {
  // Get the LATEST comments from Redux store
  const obs_per_insp_bar_comment = chartsComments?.find((c) => c.name === "obs_per_insp_bar");
  const obs_and_obs_insp_bar_comment = chartsComments?.find((c) => c.name === "obs_and_obs_insp_bar");

  // Update Chart 1 PDF data
  if (obs_per_insp_bar.current) {
    const initialSvg = obs_per_insp_bar.current?.querySelector('svg')?.outerHTML;
    dispatch(addChartForPdf({
      id: 1,
      title: "Observation per Inspection (Averages & Percentages)",
      svg: initialSvg,
      name: "obs_per_insp_bar",
      // comments: obs_per_insp_bar_comment ? obs_per_insp_bar_comment.note : "No comments available",
      lastUpdated: obs_per_insp_bar_comment ? obs_per_insp_bar_comment.updated_at : null,
      commentId: obs_per_insp_bar_comment ? obs_per_insp_bar_comment.id : null,
      dataTimestamp: new Date().toISOString() // Track when data was captured
    }));
  }

  // Update Chart 2 PDF data
  if (obs_and_obs_insp_bar.current) {
    const finalSvg = obs_and_obs_insp_bar.current?.querySelector('svg')?.outerHTML;
    dispatch(addChartForPdf({
      id: 2,
      title: "Observations and Obs/Insp",
      svg: finalSvg,
      name: "obs_and_obs_insp_bar",
      // comments: obs_and_obs_insp_bar_comment ? obs_and_obs_insp_bar_comment.note : "No comments available",
      lastUpdated: obs_and_obs_insp_bar_comment ? obs_and_obs_insp_bar_comment.updated_at : null,
      commentId: obs_and_obs_insp_bar_comment ? obs_and_obs_insp_bar_comment.id : null,
      dataTimestamp: new Date().toISOString()
    }));
  }
}, [dispatch, chartsComments]);

// Main useEffect that handles all PDF updates when data/comments change
useEffect(() => {
  const captureAndDispatchCharts = () => {
    updatePdfWithLatestData();
  };

  // Only run if we have meaningful data
  if (overallAverages && Object.keys(overallAverages).length > 0) {
    // Use a shorter timeout since we're updating more frequently
    const timer = setTimeout(captureAndDispatchCharts, 500);
    return () => clearTimeout(timer);
  }
}, [
  // Core dependencies that should trigger PDF updates
  overallAverages, 
  overallAveragesPercentages,
  overall,
  vesselInspectionCount,
  chartsComments,
  // Filter dependencies
  selectedFilter,
  customStartDate,
  customEndDate,
  specificYear,
  // Include the update function
  updatePdfWithLatestData
]);

// Separate useEffect to handle API data changes
useEffect(() => {
  // When new API data comes in, update PDF after a short delay to allow charts to render
  if (observationData?.data && chartsComments) {
    const timer = setTimeout(() => {
      updatePdfWithLatestData();
    }, 1000); // Slightly longer delay for API data changes
    return () => clearTimeout(timer);
  }
}, [observationData?.data, updatePdfWithLatestData]);

// Expose the update function globally for GraphNotesManager
useEffect(() => {
  window.updatePdfComments = () => {
    // Add a small delay to ensure Redux state is updated
    setTimeout(() => {
      updatePdfWithLatestData();
    }, 100);
  };
  
  return () => {
    delete window.updatePdfComments;
  };
}, [updatePdfWithLatestData]);

// Notes fetching effects
useEffect(() => {
  const fetchAllNotes = async () => {
    try {
      dispatch(clearChartsComments());
      await getGraphNotes({});
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  };
  fetchAllNotes();
}, [getGraphNotes]);

useEffect(() => {
  window.refetchAllNotes = async () => {
    try {
      await getGraphNotes({});
    } catch (err) {
      console.error("Failed to refetch notes:", err);
    }
  };
  return () => {
    delete window.refetchAllNotes;
  };
}, [getGraphNotes]);

  const getDateRangeText = (filter, startDate, endDate, year) => {
    const today = new Date();

    switch (filter) {
      case "all":
        return "All Time";
      case "current_year":
        return today.getFullYear().toString();
      case "previous_year":
        return (today.getFullYear() - 1).toString();
      case "specific_year":
        return year ? year.toString() : "";
      case "last_30_days":
        return "Last 30 Days";
      case "last_90_days":
        return "Last 90 Days";
      case "last_6_months":
        return "Last 6 Months";
      case "custom_range":
        if (startDate && endDate) {
          return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        }
        return "";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "300px"
      }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "300px",
        color: "#E53935"
      }}>
        Error loading observation data
      </div>
    );
  }

  const enhancedOptions = {
    chart: {
      type: "bar",
      height: 400,
      toolbar: { show: false },
      offsetX: 10,
      offsetY: 10
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        endingShape: "rounded",
        borderRadiusApplication: "end",
        borderRadius: 4,
        dataLabels: {
          position: "top"
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#000"],
        fontWeight: 'normal'
      }
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"]
    },
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const chart1Options = {
    ...enhancedOptions,
    xaxis: {
      categories: ["Wrong Observations", "Negative Observations", "Positive Observations"],
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: { text: "Count/Average" }
    },
    colors: ["#1E88E5", "#E53935", "#43A047"],
    title: {
      // text: "Observation per inspection",
      align: "center",
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    legend: {
      position: "bottom"
    },
    tooltip: {
      ...enhancedOptions.tooltip,
      y: {
        formatter: (val) => val.toFixed(2)
      }
    }
  };

  const chart1Series = [
    {
      name: "Average Count",
      data: [
        overallAverages.avgWrongObservations || 0,
        overallAverages.avgNegativeObservations || 0,
        overallAverages.avgPositiveObservations || 0
      ]
    },
    {
      name: "Percentage",
      data: [
        (overallAveragesPercentages.percentWrongObservations || 0),
        (overallAveragesPercentages.percentNegativeObservations || 0),
        (overallAveragesPercentages.percentPositiveObservations || 0)
      ]
    }
  ];

  // Chart 2: Observations and obs/Insp
  const chart2Options = {
    ...enhancedOptions,
    xaxis: {
      categories: ["Wrong Observations", "Negative Observations", "Positive Observations"],
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: { text: "Count" }
    },
    colors: ["#1E88E5", "#E53935", "#43A047"],
    title: {
      // text: "Observations and Obs/Insp",
      align: "center",
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    legend: {
      position: "bottom"
    },
    tooltip: {
      ...enhancedOptions.tooltip,
      y: {
        formatter: (val) => val.toFixed(2)
      }
    }
  };

  const chart2Series = [
    {
      name: "Total Count",
      data: [
        overall.totalWrongObservations || 0,
        overall.totalNegativeObservations || 0,
        overall.totalPositiveObservations || 0
      ]
    },
    {
      name: "Per Inspection",
      data: [
        overallAverages.avgWrongObservations || 0,
        overallAverages.avgNegativeObservations || 0,
        overallAverages.avgPositiveObservations || 0
      ]
    }
  ];

  return (
<div>
      {/* Date Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-800">Vetting Analytics</h1>
            <p className="text-gray-600">
              The Vetting Analytics module provides graphical insights into fleet wide observations
            </p>
          </div>
          <div className="flex items-center">
            {/* <PdfGenerator /> */}

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(RouteConstant.UPLOAD)}
                className="px-6 h-[50px] bg-primary
                                  text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl
                                  transition-all duration-300 flex items-center gap-3
                                  hover:scale-105 active:scale-95"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Upload SIRE 2.0 Report</span>
              </button>
            </div>

          </div>
        </div>
       <div className="space-y-6 mt-3">
        {/* Filter Controls Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex lg:flex-row gap-4 items-end">
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">
                Filter by Date Range
              </label>
              <select
                value={selectedFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] h-10"
              >
                {dateFilterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Inputs */}
            {showCustomInputs && (
              <>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  />
                </div>
              </>
            )}

            {/* Specific Year Input */}
            {showYearInput && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={specificYear}
                  onChange={(e) => {setSpecificYear(e.target.value) }}
                  placeholder="e.g., 2023"
                  min="2000"
                  max="2030"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32 h-10"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleApplyFilter}
                disabled={
                  (selectedFilter === "custom_range" && (!customStartDate || !customEndDate)) ||
                  (selectedFilter === "specific_year" && !specificYear)
                }
                className="px-4 py-2 h-10 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
              >
                Apply Filter
              </button>
              <button
                onClick={handleResetFilter}
                className="px-4 py-2 h-10 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium text-sm whitespace-nowrap"
              >
                Reset
              </button>
            </div>

            {/* Heading */}
            {/* <div className="flex items-end max-w-md ml-5">
              <h1 className="text-base font-semibold text-gray-800 leading-tight mb-0">
                The Vetting Analytics module provides graphical insights into fleet wide observations
              </h1>
            </div> */}
            <div className="flex items-end max-w-md ml-5">
            <PdfGenerator />
            </div>
          </div> 
        </div> 
      </div>
      </div>

      {/* Summary Cards */}
      <div className="from-cyan-500 to-blue-600 bg-gradient-to-r p-1 rounded-lg shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-around items-center gap-3 text-center text-white">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm min-w-[130px]">
            <p className="text-xs font-medium">Total Inspections</p>
            <p className="text-xl font-bold">{vesselInspectionCount}</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm min-w-[130px]">
            <p className="text-xs font-medium">Total Observations</p>
            <p className="text-xl font-bold">{overall?.totalObservations || 0}</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm min-w-[130px]">
            <p className="text-xs font-medium">Wrong Marked</p>
            <p className="text-xl font-bold">{overall?.totalWrongObservations || 0}</p>
          </div>
        </div>
      </div>

    <div className="bg-white px-4 rounded-lg shadow mb-4">
      {/* Chart Section 1: Observation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 mb-6">
        <div className="bg-white-50 px-4 py-2 border-b border-gray-200">
           <h3 className="text-base font-semibold text-gray-800 text-center">
               Observation per inspection
           </h3>
          <InlineExpandableInfo 
            explanation={[
              overallAverages?.calculation, 
              overallAveragesPercentages?.calculation
            ]}
          />
          <div ref={obs_per_insp_bar}>
          <Chart
            options={chart1Options}
            series={chart1Series}
            type="bar"
            height={400}
          /></div>
        </div>

        <div className="bg-white px-4 rounded-lg shadow">
          <h3 className="text-base font-semibold text-gray-800 text-center">
               Observations and Obs/Insp
           </h3>
          <InlineExpandableInfo 
            explanation={[
              overallAverages?.calculation, 
              "Total Count of Observations"
            ]}
          />
          <div ref={obs_and_obs_insp_bar}>
          <Chart
            options={chart2Options}
            series={chart2Series}
            type="bar"
            height={400}
          /></div>
        </div>
        </div>

         <div className="px-4">
          <GraphNotesManager 
            graphName="obs_per_insp_bar" 
            displayName="Observation per Inspection (Averages & Percentages)"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          /></div>
      </div>
      
      {/* Inspection Insights Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <InspectionInsights byCategory={byCategory} byTag={byTag} overall={overall} />
        </div>
      </div>

      {/* Chapters Chart Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <ChaptersChart 
            chapterNegativeAverages={chapterNegativeAverages} 
            byChapterNegativeOnlyWithPercent={byChapterNegativeOnlyWithPercent} 
          />
          <GraphNotesManager 
            graphName="chapter_wise_obs" 
            displayName="Chapters"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* Chapter Core RT Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <ChapterCoreRT byChapterNegativeOnlyWithPercent={byChapterNegativeOnlyWithPercent} />
          <GraphNotesManager 
            graphName="chapter_question_type_obs" 
            displayName="Chapter Core RT Obs"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* Chapter Category Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <ChapterCategory byChapterNegativeOnlyWithPercent={byChapterNegativeOnlyWithPercent} />
          <GraphNotesManager 
            graphName="chapter_question_category_obs" 
            displayName="Chapter category Obs"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* Risk Rating Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <RiskRatingChart byTag={byTag} riskBreakdown={riskBreakdown} />
          <GraphNotesManager 
            graphName="risk_obs" 
            displayName="Risk Rating"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* Human Observation Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <HumanObservationCharts 
            cumulativeHumans={cumulativeHumans} 
            crewPositiveAverages={crewPositiveAverages} 
            crewNegativeAverages={crewNegativeAverages} 
            departmentAverages={departmentAverages} 
          />
          <GraphNotesManager 
            graphName="human_obs" 
            displayName="Human Observation"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* Fleet Overview Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <FleetOverviewChart byVessel={byVessel} />
          <GraphNotesManager 
            graphName="fleet_overview" 
            displayName="Fleet Overview"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div> 

      {/* Positive/Negative TMSA Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <PositiveNegativeTMSA pif={byPIF} tmsa={byTMSA}/>
          <GraphNotesManager 
            graphName="tmsa_trends" 
            displayName="TMSA Trends"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>

      {/* PIF per Rank Section */}
      <div className="w-full mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <PIFPerRankChart rankData={pifByCrewPosition} />
          <GraphNotesManager 
            graphName="pif_rank" 
            displayName="PIF per rank"
            allNotesData={allNotesData}
            notesLoading={notesLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default VesselCharts;