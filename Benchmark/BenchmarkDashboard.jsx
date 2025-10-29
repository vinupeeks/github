import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import BenchmarkFormModal from "./BenchmarkFormModal";
import BenchmarkDetailsPopup from "./BenchmarkDetailsPopup";

const API_URL = "http://localhost:3003/api/benchmark/";

const BenchmarkDashboard = () => {
    const token = useSelector((state) => state.auth?.user?.jwttoken);
    const [benchmarks, setBenchmarks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [rawBenchmarkData, setRawBenchmarkData] = useState({});
    const [editingBenchmark, setEditingBenchmark] = useState(null);
    const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false);
    const [selectedBenchmarkForDetails, setSelectedBenchmarkForDetails] = useState(null);

    const fetchBenchmarks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const headers = {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
        };

        try {
            const response = await fetch(API_URL, { headers });
            if (!response.ok) throw new Error("Failed to fetch benchmarks");
            const data = await response.json();

            const benchmarksArray = Array.isArray(data) ? data : [data].filter(Boolean);
            const rawDataMap = {};
            benchmarksArray.forEach(b => rawDataMap[b.id] = b);
            setRawBenchmarkData(rawDataMap);

            const processed = benchmarksArray.map(processBenchmarkData);
            setBenchmarks(processed);
        } catch (err) {
            console.error(err);
            setError("Failed to load benchmarks. Please check your connection or login again.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const processBenchmarkData = (apiBenchmark) => {
        let totalObservations = 0, obsTotalPositive = 0, obsTotalNegative = 0;
        const totalInspections = apiBenchmark.vesselInspections?.length || 0;

        apiBenchmark.vesselInspections?.forEach(inspection => {
            inspection.benchmark_inspection_questions?.forEach(question => {
                totalObservations++;
                question.benchmark_inspection_scores?.forEach(score => {
                    score.isNegative === 'yes' ? obsTotalNegative++ : obsTotalPositive++;
                });
            });
        });

        return {
            id: apiBenchmark.id,
            benchmarkName: apiBenchmark.name,
            reportDate: apiBenchmark.reportDate,
            totalInspections,
            totalObservations,
            obsTotalPositive,
            obsTotalNegative,
            rawData: apiBenchmark
        };
    };

    useEffect(() => { fetchBenchmarks(); }, [fetchBenchmarks]);

    const handleFormSubmit = async (submissionData, isEditMode = false) => {
        setIsSubmitting(true);
        const headers = {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
        };
        try {
            const url = isEditMode
                ? `${API_URL}edit/${submissionData.id}`
                : API_URL;
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(submissionData),
            });
            if (!response.ok) throw new Error("Save failed");

            await fetchBenchmarks();
            alert(`Benchmark ${isEditMode ? "updated" : "created"} successfully!`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
        }
    };

    const handleEdit = (b) => {
        setEditingBenchmark(b.rawData);
        setIsModalOpen(true);
    };

    const handleViewDetails = (b) => {
        setSelectedBenchmarkForDetails(b);
        setIsDetailsPopupOpen(true);
    };

    const handleDelete = async (benchmarkId) => {
        if (!window.confirm("Are you sure you want to delete this benchmark?")) return;

        const headers = {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
        };

        try {
            const response = await fetch(`${API_URL}delete/${benchmarkId}`, {
                method: "PUT",
                headers,
            });

            if (!response.ok) throw new Error("Failed to delete benchmark");

            await fetchBenchmarks();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const getDetailedObservations = (benchmarkId) => {
        const benchmark = rawBenchmarkData[benchmarkId];
        if (!benchmark) return [];
        const obs = [];
        benchmark.vesselInspections?.forEach((insp, inspIdx) => {
            insp.benchmark_inspection_questions?.forEach((q, qIdx) => {
                obs.push({
                    inspectionIndex: inspIdx + 1,
                    questionIndex: qIdx + 1,
                    chapterNo: q.chapter_no,
                    viq: q.viq || "N/A",
                    tag: q.tag || "N/A",
                    scores: q.benchmark_inspection_scores || [],
                });
            });
        });
        return obs;
    };

    const filteredBenchmarks = benchmarks.filter(b =>
        b.benchmarkName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen p-2 md:p-4 rounded-lg from-cyan-500 to-blue-400 bg-gradient-to-r">
            <div className="mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-8 border-b border-blue-200 pb-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        Industry Benchmark
                    </h1>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search benchmark..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-60 py-2 pl-10 pr-3 border border-white rounded-lg text-sm focus:ring-2 focus:ring-white focus:border-white outline-none bg-white placeholder-gray-700"
                            />
                            <svg
                                className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            onClick={() => {
                                setEditingBenchmark(null);
                                setIsModalOpen(true);
                            }}
                            className="py-2 px-4 rounded-lg shadow text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all border border-black"
                        >
                            + New Benchmark
                        </button>
                    </div>
                </header>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5">
                    {error ? (
                        <div className="text-center py-10 text-red-600 bg-red-50 rounded-lg">{error}</div>
                    ) : isLoading ? (
                        <div className="text-center py-10 text-blue-500 font-medium">Loading Benchmarks...</div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-3">
                                Showing <strong>{filteredBenchmarks.length}</strong> benchmark
                                {filteredBenchmarks.length !== 1 ? "s" : ""}
                            </p>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-gray-700 border-t border-blue-100">
                                    <thead className="bg-blue-50 text-blue-800 uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">Benchmark Name</th>
                                            <th className="px-3 py-2 text-left">Report Date</th>
                                            <th className="px-3 py-2 text-center">Inspections</th>
                                            <th className="px-3 py-2 text-center">Observations</th>
                                            <th className="px-3 py-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBenchmarks.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-8 text-gray-500 italic">
                                                    No benchmarks found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredBenchmarks.map((b, i) => (
                                                <tr key={b.id} className="hover:bg-blue-50/60 transition">
                                                    <td className="px-3 py-2">{i + 1}</td>
                                                    <td className="px-3 py-2 font-semibold text-gray-800">{b.benchmarkName}</td>
                                                    <td className="px-3 py-2">{b?.rawData?.vesselInspections?.[0]?.report_date || "N/A"}</td>
                                                    <td className="px-3 py-2 text-center">{b.totalInspections}</td>
                                                    <td className="px-3 py-2 text-center">{b.totalObservations}</td>
                                                    <td className="px-3 py-2 text-center space-x-2">
                                                        <button
                                                            onClick={() => handleViewDetails(b)}
                                                            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                                        >
                                                            Details
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(b)}
                                                            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(b.id)}
                                                            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                        >
                                                            🗑 Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Modals */}
                <BenchmarkFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleFormSubmit}
                    isLoading={isSubmitting}
                    editData={editingBenchmark}
                />

                <BenchmarkDetailsPopup
                    isOpen={isDetailsPopupOpen}
                    onClose={() => setIsDetailsPopupOpen(false)}
                    benchmark={selectedBenchmarkForDetails}
                    getDetailedObservations={getDetailedObservations}
                />
            </div>
        </div>
    );
};

export default BenchmarkDashboard;
