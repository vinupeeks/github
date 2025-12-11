import React, { useEffect, useState } from "react"; // ADDED useState
import { useLocation } from "react-router-dom";
import { useVesselPredictionDataMutation } from "../../redux/services/uploadApi";
import { Loader2, Sparkles, Download } from "lucide-react"; // ADDED FileDown
import PredictionExportModal from "./PredictionExportModal"; // IMPORT THE NEW COMPONENT

// Single Source of Truth for Custom Probability Groups (20% increments, then 80/90 split)
const PROBABILITY_GROUPS = [
    // max is exclusive (value < max). Use < 1 to catch 0 and undefined values gracefully.
    { max: 1, label: "0%", className: "bg-white border border-gray-300 text-gray-500", showBorder: true }, // Added showBorder flag
    { max: 20, label: "01% - 19%", className: "bg-yellow-100 text-gray-700" },
    { max: 40, label: "20% - 39%", className: "bg-yellow-300 text-gray-800" },
    { max: 60, label: "40% - 59%", className: "bg-orange-300 text-white" },
    { max: 80, label: "60% - 79%", className: "bg-orange-400 text-white" },

    // REQUESTED CUSTOM SPLIT
    { max: 90, label: "80% - 89%", className: "bg-red-400 text-white" },
    { max: Infinity, label: "90%+ (Critical)", className: "bg-orange-600 text-white" }
];

const getRowColorByProbability = (probability) => {
    if (!probability) return PROBABILITY_GROUPS[0].className;

    const value = parseFloat(probability.toString().replace('%', ''));
    // If NaN or < 1, treat it as the lowest group (max: 1)
    if (isNaN(value) || value < 1) return PROBABILITY_GROUPS[0].className;

    // Find the first group where the value is less than the max
    const group = PROBABILITY_GROUPS.find(g => value < g.max);

    // Fallback to the highest risk (90%+)
    return group ? group.className : PROBABILITY_GROUPS[PROBABILITY_GROUPS.length - 1].className;
};

// Utility function for the concise legend display (UPDATED TO INCLUDE 0%)
const getConciseProbabilityLegend = () => {
    // Return ALL groups
    return PROBABILITY_GROUPS;
};


const getYesCount = (dates = []) => { return dates.filter(d => d.present === "Yes").length; };

const getPresenceCellStyle = (presentStatus) => {
    switch (presentStatus) {
        case "Yes":
            return "text-green-800 bg-green-50 font-semibold";
        case "No":
            return "text-orange-700 bg-orange-50 font-medium";
        default:
            return "text-gray-400 bg-gray-100/50";
    }
}

export default function ViqPrediction() {
    const [getPredictionData, { data: predictionData, isLoading }] = useVesselPredictionDataMutation();
    const location = useLocation();
    const vesselId = location.state?.vesselId;
    const vesselName = location.state?.vesselName;
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (vesselId) { getPredictionData({ vessel_id: vesselId }); }
    }, [vesselId, getPredictionData]);

    const responseData = [...(predictionData?.data || [])].sort((a, b) => {
        const viqA = a.viq?.replace(/\.$/, "") || "";
        const viqB = b.viq?.replace(/\.$/, "");
        const partsA = viqA.split(".").map(Number);
        const partsB = viqB.split(".").map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const diff = (partsA[i] || 0) - (partsB[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    });

    const maxInspectionCount = Math.max(...responseData?.map((item) => item?.dates?.length || 0), 0);

    const getLastAppearedDate = (dates = []) => {
        const appearedDates = dates
            ?.filter((d) => d.present === "Yes" && d.date)
            ?.map((d) => new Date(d.date));
        if (appearedDates?.length === 0) return "-";
        const lastDate = new Date(Math.max(...appearedDates));
        return lastDate.toLocaleDateString("en-GB");
    };

    // Get the concise legend data
    const predictionLegend = getConciseProbabilityLegend();


    return (
        <div className="p-2 md:p-4 rounded-lg from-cyan-500 to-blue-400 bg-gradient-to-r">

            {/* HEADER & TITLE SECTION - This part will NOT scroll (as per your requirement) */}
            <header className="mb-3 p-4 bg-white rounded-xl shadow-2xl border-b-6 border-blue-600">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-extrabold text-blue-900 flex items-center">
                        <Sparkles className="w-8 h-8 mr-3 text-blue-500" />
                        Prediction Analysis - {vesselName || 'N/A'}
                    </h1>
                    {/* NEW BUTTON: View and Export */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isLoading || responseData?.length === 0}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        View & Export
                    </button>
                </div>
                <div className="mt-2 flex justify-between items-center flex-wrap gap-4">
                    <span className="text-sm font-bold text-gray-500">Predictive Insights for VIQ Rotational Questions (R1 & R2)</span>
                </div>
                <div className=" pt-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
                    <h3 className="text-sm font-light text-gray-600 mb-2 md:mb-0">
                        Next Inspection Probability:
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {predictionLegend.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center text-[10px] font-semibold"
                            >
                                <span
                                    className={`w-3 h-3 rounded-sm mr-1.5 ${item.className} ${item.showBorder ? "border border-gray-300" : ""
                                        }`}
                                ></span>
                                <span className="text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>
            {/* END HEADER SECTION */}

            {/* Loading State, Empty State (Keep as is) */}
            {isLoading && (
                <div className="flex justify-center items-center h-60 text-blue-600 bg-white shadow-xl rounded-xl">
                    <Loader2 className="animate-spin w-8 h-8 mr-4" />
                    <span className="text-xl font-medium">Loading SIRE Prediction Data...</span>
                </div>
            )}
            {!isLoading && responseData?.length === 0 && (
                <p className="text-gray-600 p-6 border border-dashed border-blue-300 rounded-xl bg-white shadow-md">
                    No prediction data available for this vessel.
                </p>
            )}

            {/* Data Table */}
            {!isLoading && responseData?.length > 0 && (
                // 2. Added max-h-[70vh] (adjust this value) to limit the height of the entire table and force vertical scrolling. 
                //    '70vh' is a good starting point, meaning 70% of the viewport height.
                <div className="bg-white shadow-2xl rounded-xl border rounded-b-xl border-blue-200 mt-2 flex flex-col max-h-[77vh]">

                    {/* 3. Added overflow-y-auto to this container to handle the vertical scrolling of the table. 
                         Kept overflow-x-auto for horizontal scrolling. */}
                    <div className="overflow-y-auto overflow-x-auto border rounded-xl">
                        <table className="min-w-full text-xs relative">

                            {/* Table Header - 'sticky top-0' correctly keeps this visible during vertical scroll */}
                            <thead className="bg-blue-900 text-white uppercase tracking-wider sticky top-0 z-20 shadow-lg">
                                <tr>
                                    <th className="px-4 py-3 text-left max-w-[40px] sticky left-0 bg-blue-900 z-30 border-r border-blue-700">VIQ Chapter</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left max-w-[30px]">Date VIQ last used</th>
                                    {/* <th className="px-4 py-3 text-left max-w-[30px]">Last Recorded Date</th> */}
                                    {/* Dynamic Inspection Headers */}
                                    {Array.from({ length: maxInspectionCount }).map((_, idx) => (
                                        <th key={idx} className="px-4 py-3 text-center border-l border-blue-700">
                                            {`Insp. ${idx + 1}`}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center bg-blue-700 font-bold sticky right-0 z-30">INSP. Counter</th>
                                </tr>
                            </thead>

                            {/* Table Body - This is the content that will scroll vertically */}
                            <tbody>
                                {/* ... (Keep all your existing Table Row/Cell rendering logic) ... */}
                                {responseData?.map((item, index) => {
                                    const lastDate = getLastAppearedDate(item?.dates);
                                    const yesCount = getYesCount(item?.dates);

                                    return (
                                        <tr
                                            key={index}
                                            className={`hover:bg-blue-50/50 transition duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                        >
                                            {/* Sticky VIQ column body - Needs background color for left stickiness over scrolling content */}
                                            <td className={`px-4 py-3 font-extrabold border-r border-blue-100 sticky left-0 z-10 text-blue-900 ${getRowColorByProbability(item.prediction)}`}>
                                                {item?.viq}
                                            </td>

                                            {/* Cycle Type & Last Observation Date - Removed 'sticky right-0' from these columns as they are standard middle columns */}
                                            <td className={`px-4 py-2 text-center text-blue-900`}>
                                                {item?.cycleType}
                                            </td>
                                            <td className={`px-4 py-2 text-center text-blue-900`}>
                                                {lastDate}
                                            </td>

                                            {/* Inspection Cells */}
                                            {Array.from({ length: maxInspectionCount }).map((_, idx) => {
                                                const dateInfo = item.dates?.[idx];
                                                const presentStatus = dateInfo?.present || '-';

                                                return (
                                                    <td key={idx} className={`px-4 py-2 text-center border-l border-gray-100 text-sm ${getPresenceCellStyle(dateInfo?.present)}`} >
                                                        {presentStatus}
                                                    </td>
                                                );
                                            })}

                                            {/* INSP. Counter Cell - Entire cell uses the probability color, and is sticky right */}
                                            <td className={`px-4 py-2 text-center text-xs font-extrabold sticky right-0 z-10 ${getRowColorByProbability(item.prediction)}`}>
                                                {yesCount}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* NEW MODAL COMPONENT */}
            <PredictionExportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                predictionData={responseData}
                vesselId={vesselId}
                vesselName={vesselName}
                maxInspectionCount={maxInspectionCount}
            />
        </div>
    );
}