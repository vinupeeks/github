import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useVesselPredictionDataMutation } from "../../redux/services/uploadApi";
import { Loader2 } from "lucide-react";

export default function ViqPrediction() {
    const [getPredictionData, { data: predictionData, isLoading }] = useVesselPredictionDataMutation();
    const location = useLocation();
    const vesselId = location.state?.vesselId;
    const vesselName = location.state?.vesselName;

    useEffect(() => {
        if (vesselId) {
            getPredictionData({ vessel_id: vesselId });
        }
    }, [vesselId]);

    const responseData = predictionData?.data || [];

    // ✅ Dynamically determine maximum inspections (based on available data)
    const maxInspectionCount = Math.max(
        ...responseData.map((item) => item.dates?.length || 0),
        0
    );

    // ✅ Function to get last appeared date (latest "Yes")
    const getLastAppearedDate = (dates = []) => {
        const appearedDates = dates
            .filter((d) => d.present === "Yes" && d.date)
            .map((d) => new Date(d.date));
        if (appearedDates.length === 0) return "-";
        const lastDate = new Date(Math.max(...appearedDates));
        return lastDate.toLocaleDateString("en-GB"); // format DD/MM/YYYY
    };

    return (
        <div className="p-6 bg-blue-200 rounded-md min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                VIQ Prediction Overview
            </h1>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent inline-block"            >
                {vesselName} - SIRE 2.0 Analysis
            </h1>

            {isLoading ? (
                <div className="flex justify-center items-center h-40 text-gray-600">
                    <Loader2 className="animate-spin w-6 h-6 mr-2" />
                    Loading Prediction Data...
                </div>
            ) : responseData.length === 0 ? (
                <p className="text-gray-500">No prediction data available.</p>
            ) : (
                <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-300 bg-white">
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-blue-900 text-white text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-3 py-3 text-left border-r border-blue-800">VIQ</th>
                                <th className="px-3 py-3 text-left border-r border-blue-800">
                                    Cycle Type
                                </th>
                                <th className="px-3 py-3 text-left border-r border-blue-800">
                                    Last Appeared Date
                                </th>

                                {/* Dynamically create only required inspection columns */}
                                {Array.from({ length: maxInspectionCount }).map((_, idx) => (
                                    <th
                                        key={idx}
                                        className="px-3 py-3 text-center border-r border-blue-800"
                                    >
                                        {`Inspection ${idx + 1}`}
                                    </th>
                                ))}

                                <th className="px-3 py-3 text-center border-r border-blue-800">
                                    Prediction
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {responseData.map((item, index) => {
                                const lastDate = getLastAppearedDate(item.dates);

                                return (
                                    <tr
                                        key={index}
                                        className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                            } hover:bg-blue-50 transition`}
                                    >
                                        <td className="px-3 py-2 font-semibold text-gray-800 border border-gray-200">
                                            {item.viq}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-700">
                                            {item.cycleType}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-600">
                                            {lastDate}
                                        </td>

                                        {Array.from({ length: maxInspectionCount }).map((_, idx) => {
                                            const dateInfo = item.dates?.[idx];
                                            if (!dateInfo) return <td key={idx}></td>;
                                            return (
                                                <td
                                                    key={idx}
                                                    className={`px-3 py-2 text-center border border-gray-200 font-medium ${dateInfo.present === "Yes"
                                                        ? "text-green-600"
                                                        : "text-red-500"
                                                        }`}
                                                >
                                                    {dateInfo.present}
                                                </td>
                                            );
                                        })}

                                        <td className="px-3 py-2 border border-gray-200 text-blue-600 font-semibold text-center">
                                            {item.prediction}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
