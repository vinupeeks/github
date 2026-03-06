// import React, { useState, useEffect } from "react";

// // --- GLOBAL CONSTANTS ---
// const API_URL = "http://localhost:3003/api/benchmark/";

// const initialFormData = {
//     name: "",
//     reportDate: "",
//     totalInspections: 0,
//     inspectionDetails: [
//         {
//             chapterNo: '',
//             viq: '',
//             tag: '',
//             negativeEntries: [{ category: '', isNegative: 'yes' }]
//         }
//     ],
// };

// const PRIMARY_FIELDS = ['name', 'reportDate', 'totalInspections'];

// // Reusable InputField component
// const InputField = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false }) => (
//     <div>
//         <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
//         <input
//             type={type}
//             name={name}
//             id={name}
//             value={value}
//             onChange={onChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
//             placeholder={placeholder}
//             required={required}
//             disabled={disabled}
//         />
//     </div>
// );

// // Main Form Modal Component
// const BenchmarkFormModal = ({ isOpen, onClose, onSubmit, isLoading, editData = null }) => {
//     const [formData, setFormData] = useState(initialFormData);
//     const [isEditMode, setIsEditMode] = useState(false);

//     // Initialize form data when editData changes or modal opens
//     useEffect(() => {
//         if (editData && isOpen) {
//             console.log("Edit Data Received:", editData); // Debug log
//             setIsEditMode(true);

//             // Transform the API data to match our form structure
//             const transformedData = {
//                 name: editData.name || "",
//                 reportDate: editData?.vesselInspections[0]?.report_date || "",
//                 totalInspections: editData.totalInspections || 0,
//                 inspectionDetails: []
//             };

//             // Check if we have vesselInspections data (from API response)
//             if (editData.vesselInspections && editData.vesselInspections.length > 0) {
//                 transformedData.inspectionDetails =
//                     editData.vesselInspections[0]?.benchmark_inspection_questions?.map(question => ({
//                         chapterNo: question.chapter_no || "",
//                         viq: question.viq || question.viq_id || "",
//                         tag: question.tag || "",
//                         negativeEntries: question.benchmark_inspection_scores?.map(score => ({
//                             category: score.category || "",
//                             isNegative: score.isNegative || "yes"
//                         })) || [{ category: '', isNegative: 'yes' }]
//                     })) || initialFormData.inspectionDetails;
//             } else if (editData.inspectionDetails) {
//                 // Use direct inspectionDetails if available
//                 console.log(editData.inspectionDetails);

//                 transformedData.inspectionDetails = editData.inspectionDetails.map(detail => ({
//                     chapterNo: detail.chapterNo || "",
//                     viq: detail.viq || "",
//                     tag: detail.tag || "",
//                     negativeEntries: detail.negativeEntries?.map(entry => ({
//                         category: entry.category || "",
//                         isNegative: entry.isNegative || "yes"
//                     })) || [{ category: '', isNegative: 'yes' }]
//                 }));
//             } else {
//                 transformedData.inspectionDetails = initialFormData.inspectionDetails;
//             }

//             // Ensure we have at least one inspection detail
//             if (transformedData.inspectionDetails.length === 0) {
//                 transformedData.inspectionDetails = initialFormData.inspectionDetails;
//             }

//             setFormData(transformedData);
//         } else {
//             setIsEditMode(false);
//             setFormData(initialFormData);
//         }
//     }, [editData, isOpen]);

//     // Handles changes for top-level fields
//     const handleTopLevelChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({
//             ...prev,
//             [name]: name === 'totalInspections' ? parseInt(value) || 0 : value,
//         }));
//     };

//     // Handles changes for nested inspectionDetails fields
//     const handleDetailChange = (index, e) => {
//         const { name, value } = e.target;
//         const newDetails = [...formData.inspectionDetails];
//         newDetails[index] = {
//             ...newDetails[index],
//             [name]: value,
//         };
//         setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
//     };

//     // Handles changes for nested negativeEntries fields
//     const handleNegativeEntryChange = (detailIndex, entryIndex, e) => {
//         const { name, value } = e.target;
//         const newDetails = [...formData.inspectionDetails];
//         const newEntries = [...newDetails[detailIndex].negativeEntries];
//         newEntries[entryIndex] = {
//             ...newEntries[entryIndex],
//             [name]: value,
//         };
//         newDetails[detailIndex].negativeEntries = newEntries;
//         setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
//     };

//     // CRUD for Inspection Details
//     const addDetail = () => {
//         setFormData(prev => ({
//             ...prev,
//             inspectionDetails: [
//                 ...prev.inspectionDetails,
//                 { chapterNo: '', viq: '', tag: '', negativeEntries: [{ category: '', isNegative: 'yes' }] },
//             ],
//         }));
//     };

//     const removeDetail = (index) => {
//         const newDetails = formData.inspectionDetails.filter((_, i) => i !== index);
//         setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
//     };

//     // CRUD for Negative Entries
//     const addNegativeEntry = (detailIndex) => {
//         const newDetails = [...formData.inspectionDetails];
//         newDetails[detailIndex].negativeEntries.push({ category: '', isNegative: 'yes' });
//         setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
//     };

//     const removeNegativeEntry = (detailIndex, entryIndex) => {
//         const newDetails = [...formData.inspectionDetails];
//         const newEntries = newDetails[detailIndex].negativeEntries.filter((_, i) => i !== entryIndex);
//         newDetails[detailIndex].negativeEntries = newEntries;
//         setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         // Simple validation check
//         if (!formData.name || !formData.reportDate || formData.totalInspections <= 0) {
//             alert('Please ensure Benchmark Name, Report Date, and Total Inspections are valid.');
//             return;
//         }

//         // Clean up empty entries before submission
//         const cleanedDetails = formData.inspectionDetails
//             .filter(d => d.chapterNo && d.viq) // Keep only details with chapter/viq
//             .map(d => ({
//                 ...d,
//                 negativeEntries: d.negativeEntries.filter(n => n.category), // Keep only entries with category
//             }));

//         const submissionData = {
//             ...formData,
//             inspectionDetails: cleanedDetails,
//         };

//         // Include the ID for edit mode
//         if (isEditMode && editData?.id) {
//             submissionData.id = editData.id;
//         }

//         await onSubmit(submissionData, isEditMode);
//         setFormData(initialFormData);
//         onClose();
//     };

//     const handleClose = () => {
//         setFormData(initialFormData);
//         setIsEditMode(false);
//         onClose();
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity duration-300 flex justify-center items-center">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative m-4 transform transition-all duration-300">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
//                     {isEditMode ? 'Edit Benchmark Data' : 'Add New Benchmark Data (Aggregated)'}
//                 </h2>
//                 <button
//                     onClick={handleClose}
//                     className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//                     disabled={isLoading}
//                 >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
//                 </button>

//                 <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
//                     {/* --- 1. PRIMARY FIELDS --- */}
//                     <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
//                         <p className="text-md font-bold text-blue-700">1. Primary Benchmark Information</p>
//                         <InputField
//                             label="Benchmark Name"
//                             name="name"
//                             value={formData.name}
//                             onChange={handleTopLevelChange}
//                             placeholder="e.g., Annual Safety"
//                             required={PRIMARY_FIELDS.includes('name')}
//                             disabled={isLoading}
//                         />
//                         <div className="grid grid-cols-2 gap-3">
//                             <InputField
//                                 label="Report Date"
//                                 name="reportDate"
//                                 value={formData.reportDate}
//                                 onChange={handleTopLevelChange}
//                                 type="date"
//                                 required={PRIMARY_FIELDS.includes('reportDate')}
//                                 disabled={isLoading}
//                             />
//                             <InputField
//                                 label="Total Inspections Count"
//                                 name="totalInspections"
//                                 value={formData.totalInspections}
//                                 onChange={handleTopLevelChange}
//                                 type="number"
//                                 placeholder="0"
//                                 required={PRIMARY_FIELDS.includes('totalInspections')}
//                                 disabled={isLoading}
//                             />
//                         </div>
//                     </div>

//                     {/* --- 2. AGGREGATED INSPECTION DETAILS --- */}
//                     <div className="p-4 border rounded-lg bg-white shadow-inner">
//                         <p className="text-md font-bold text-blue-700 mb-4">2. Aggregated Inspection Details (Observations)</p>

//                         {formData.inspectionDetails.map((detail, detailIndex) => (
//                             <div key={detailIndex} className="p-3 border border-dashed border-gray-300 rounded-lg mb-4 space-y-3">
//                                 <div className="flex justify-between items-center mb-2">
//                                     <h4 className="font-semibold text-gray-800">Observation/Question #{detailIndex + 1}</h4>
//                                     {formData.inspectionDetails.length > 1 && (
//                                         <button
//                                             type="button"
//                                             onClick={() => removeDetail(detailIndex)}
//                                             className="text-red-500 hover:text-red-700 text-sm"
//                                             disabled={isLoading}
//                                         >
//                                             Remove Observation
//                                         </button>
//                                     )}
//                                 </div>
//                                 <div className="grid grid-cols-3 gap-3">
//                                     <InputField
//                                         label="Chapter No"
//                                         name="chapterNo"
//                                         value={detail.chapterNo}
//                                         onChange={(e) => handleDetailChange(detailIndex, e)}
//                                         placeholder="e.g., 5"
//                                         disabled={isLoading}
//                                     />
//                                     <InputField
//                                         label="VIQ"
//                                         name="viq"
//                                         value={detail.viq}
//                                         onChange={(e) => handleDetailChange(detailIndex, e)}
//                                         placeholder="e.g., 5.6.1"
//                                         disabled={isLoading}
//                                     />
//                                     <InputField
//                                         label="Tag"
//                                         name="tag"
//                                         value={detail.tag}
//                                         onChange={(e) => handleDetailChange(detailIndex, e)}
//                                         placeholder="e.g., Core"
//                                         disabled={isLoading}
//                                     />
//                                 </div>

//                                 {/* Negative Entries */}
//                                 <div className="ml-4 pt-2 border-t mt-3">
//                                     <p className="text-sm font-medium text-gray-600 mb-2">Negative Entries/Scores (for this Observation)</p>
//                                     {detail.negativeEntries.map((entry, entryIndex) => (
//                                         <div key={entryIndex} className="flex space-x-2 mb-2 items-center">
//                                             <InputField
//                                                 label={`Category ${entryIndex + 1}`}
//                                                 name="category"
//                                                 value={entry.category}
//                                                 onChange={(e) => handleNegativeEntryChange(detailIndex, entryIndex, e)}
//                                                 placeholder="e.g., hardware/process/human"
//                                                 disabled={isLoading}
//                                             />
//                                             <div className="w-1/4">
//                                                 <label className="block text-sm font-medium text-gray-700">Is Negative</label>
//                                                 <select
//                                                     name="isNegative"
//                                                     value={entry.isNegative}
//                                                     onChange={(e) => handleNegativeEntryChange(detailIndex, entryIndex, e)}
//                                                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
//                                                     disabled={isLoading}
//                                                 >
//                                                     <option value="yes">Yes</option>
//                                                     <option value="no">No</option>
//                                                 </select>
//                                             </div>

//                                             {detail.negativeEntries.length > 1 && (
//                                                 <button
//                                                     type="button"
//                                                     onClick={() => removeNegativeEntry(detailIndex, entryIndex)}
//                                                     className="mt-5 text-red-500 hover:text-red-700"
//                                                     disabled={isLoading}
//                                                 >
//                                                     &times;
//                                                 </button>
//                                             )}
//                                         </div>
//                                     ))}
//                                     <button
//                                         type="button"
//                                         onClick={() => addNegativeEntry(detailIndex)}
//                                         className="mt-2 py-1 px-3 rounded-md border border-green-500 text-green-600 text-xs hover:bg-green-50 transition"
//                                         disabled={isLoading}
//                                     >
//                                         + Add Score Entry
//                                     </button>
//                                 </div>
//                             </div>
//                         ))}

//                         <button
//                             type="button"
//                             onClick={addDetail}
//                             className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition duration-150 mt-4"
//                             disabled={isLoading}
//                         >
//                             + Add New Observation Detail
//                         </button>
//                     </div>

//                     {/* --- SUBMIT BUTTON --- */}
//                     <div className="pt-4 border-t mt-4">
//                         <button
//                             type="submit"
//                             className="w-full py-2.5 px-4 rounded-md shadow-md text-base font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition duration-150 flex items-center justify-center disabled:opacity-50"
//                             disabled={isLoading}
//                         >
//                             {isLoading ? (
//                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                 </svg>
//                             ) : (
//                                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
//                                 </svg>
//                             )}
//                             {isLoading ? 'Saving...' : (isEditMode ? 'Update Benchmark' : 'Save Benchmark')}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default BenchmarkFormModal;









// import React, { useState, useEffect } from "react";

// const API_URL = "http://localhost:3003/api/benchmark/";

// const initialFormData = {
//     name: "",
//     reportDate: "",
//     totalInspections: 0,
//     inspectionDetails: [
//         {
//             chapterNo: "",
//             viq: "",
//             tag: "",
//             negativeEntries: [{ category: "", isNegative: "yes" }],
//         },
//     ],
// };

// const PRIMARY_FIELDS = ["name", "reportDate", "totalInspections"];

// const InputField = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false }) => (
//     <div>
//         <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
//         <input
//             type={type}
//             name={name}
//             id={name}
//             value={value}
//             onChange={onChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
//             placeholder={placeholder}
//             required={required}
//             disabled={disabled}
//         />
//     </div>
// );

// const BenchmarkFormModal = ({ isOpen, onClose, onSubmit, isLoading, editData = null }) => {
//     const [formData, setFormData] = useState(structuredClone(initialFormData));
//     const [isEditMode, setIsEditMode] = useState(false);

//     // Initialize when modal opens or editData changes
//     useEffect(() => {
//         if (isOpen && editData) {
//             setIsEditMode(true);
//             const transformedData = {
//                 name: editData.name || "",
//                 reportDate: editData?.vesselInspections?.[0]?.report_date || "",
//                 totalInspections: editData.totalInspections || 0,
//                 inspectionDetails:
//                     editData.vesselInspections?.[0]?.benchmark_inspection_questions?.map((q) => ({
//                         chapterNo: q.chapter_no || "",
//                         viq: q.viq || "",
//                         tag: q.tag || "",
//                         negativeEntries:
//                             q.benchmark_inspection_scores?.map((s) => ({
//                                 category: s.category || "",
//                                 isNegative: s.isNegative || "yes",
//                             })) || [{ category: "", isNegative: "yes" }],
//                     })) || structuredClone(initialFormData.inspectionDetails),
//             };
//             setFormData(transformedData);
//         } else if (isOpen && !editData) {
//             setIsEditMode(false);
//             setFormData(structuredClone(initialFormData));
//         }
//     }, [editData, isOpen]);

//     // Handle top-level fields
//     const handleTopLevelChange = (e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({
//             ...prev,
//             [name]: name === "totalInspections" ? parseInt(value) || 0 : value,
//         }));
//     };

//     const handleDetailChange = (index, e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => {
//             const updated = [...prev.inspectionDetails];
//             updated[index] = { ...updated[index], [name]: value };
//             return { ...prev, inspectionDetails: updated };
//         });
//     };

//     const handleNegativeEntryChange = (detailIndex, entryIndex, e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => {
//             const updatedDetails = [...prev.inspectionDetails];
//             const updatedEntries = [...updatedDetails[detailIndex].negativeEntries];
//             updatedEntries[entryIndex] = { ...updatedEntries[entryIndex], [name]: value };
//             updatedDetails[detailIndex].negativeEntries = updatedEntries;
//             return { ...prev, inspectionDetails: updatedDetails };
//         });
//     };

//     const addDetail = () => {
//         setFormData((prev) => ({
//             ...prev,
//             inspectionDetails: [
//                 ...prev.inspectionDetails,
//                 { chapterNo: "", viq: "", tag: "", negativeEntries: [{ category: "", isNegative: "yes" }] },
//             ],
//         }));
//     };

//     const removeDetail = (index) => {
//         setFormData((prev) => ({
//             ...prev,
//             inspectionDetails: prev.inspectionDetails.filter((_, i) => i !== index),
//         }));
//     };

//     const addNegativeEntry = (detailIndex) => {
//         setFormData((prev) => {
//             const updated = [...prev.inspectionDetails];
//             updated[detailIndex].negativeEntries.push({ category: "", isNegative: "yes" });
//             return { ...prev, inspectionDetails: updated };
//         });
//     };

//     const removeNegativeEntry = (detailIndex, entryIndex) => {
//         setFormData((prev) => {
//             const updated = [...prev.inspectionDetails];
//             updated[detailIndex].negativeEntries = updated[detailIndex].negativeEntries.filter((_, i) => i !== entryIndex);
//             return { ...prev, inspectionDetails: updated };
//         });
//     };

//     const resetForm = () => {
//         setFormData(structuredClone(initialFormData));
//         setIsEditMode(false);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!formData.name || !formData.reportDate) {
//             alert("Please fill all required fields.");
//             return;
//         }

//         const cleanedDetails = formData.inspectionDetails
//             .filter((d) => d.chapterNo && d.viq)
//             .map((d) => ({
//                 ...d,
//                 negativeEntries: d.negativeEntries.filter((n) => n.category),
//             }));

//         const submissionData = { ...formData, inspectionDetails: cleanedDetails };
//         if (isEditMode && editData?.id) submissionData.id = editData.id;

//         await onSubmit(submissionData, isEditMode);
//         resetForm(); // ✅ reset after submit
//         onClose();
//     };

//     const handleClose = () => {
//         resetForm(); // ✅ reset on close
//         onClose();
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex justify-center items-center">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative m-4">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
//                     {isEditMode ? "Edit Benchmark Data" : "Add New Benchmark Data (Aggregated)"}
//                 </h2>
//                 <button
//                     onClick={handleClose}
//                     className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//                     disabled={isLoading}
//                 >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                 </button>

//                 <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
//                     {/* Primary Fields */}
//                     <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
//                         <p className="text-md font-bold text-blue-700">1. Primary Benchmark Information</p>
//                         <InputField label="Benchmark Name" name="name" value={formData.name} onChange={handleTopLevelChange} required />
//                         <div className="grid grid-cols-2 gap-3">
//                             <InputField label="Report Date" name="reportDate" type="date" value={formData.reportDate} onChange={handleTopLevelChange} required />
//                             <InputField label="Total Inspections" name="totalInspections" type="number" value={formData.totalInspections} onChange={handleTopLevelChange} required />
//                         </div>
//                     </div>

//                     {/* Inspection Details */}
//                     <div className="p-4 border rounded-lg bg-white shadow-inner">
//                         <p className="text-md font-bold text-blue-700 mb-4">2. Aggregated Inspection Details</p>
//                         {formData.inspectionDetails.map((detail, detailIndex) => (
//                             <div key={detailIndex} className="p-3 border border-dashed border-gray-300 rounded-lg mb-4 space-y-3">
//                                 <div className="grid grid-cols-3 gap-3">
//                                     <InputField label="Chapter No" name="chapterNo" value={detail.chapterNo} onChange={(e) => handleDetailChange(detailIndex, e)} required />
//                                     <InputField label="VIQ" name="viq" value={detail.viq} onChange={(e) => handleDetailChange(detailIndex, e)} required />
//                                     <div>
//                                         <label className="block text-sm font-semibold text-blue-800 mb-1">Tag</label>
//                                         <select
//                                             name="tag"
//                                             value={detail.tag}
//                                             onChange={(e) => handleDetailChange(detailIndex, e)}
//                                             className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
//                                         >
//                                             <option value="">Select Tag</option>
//                                             <option value="Core">Core</option>
//                                             <option value="Rotational 1">Rotational 1</option>
//                                             <option value="Rotational 2">Rotational 2</option>
//                                         </select>
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                         <button
//                             type="button"
//                             onClick={addDetail}
//                             className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 mt-4"
//                         >
//                             + Add Observation
//                         </button>
//                     </div>

//                     <div className="pt-4 border-t mt-4">
//                         <button
//                             type="submit"
//                             className="w-full py-2.5 px-4 rounded-md text-base font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
//                             disabled={isLoading}
//                         >
//                             {isEditMode ? "Update Benchmark" : "Save Benchmark"}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default BenchmarkFormModal;




import React, { useState, useEffect } from "react";

// --- GLOBAL CONSTANTS ---
const API_URL = "http://localhost:3003/api/benchmark/";

const initialFormData = {
    name: "",
    reportDate: "",
    totalInspections: 0,
    inspectionDetails: [
        {
            chapterNo: '',
            viq: '',
            tag: '',
            negativeEntries: [{ category: '', isNegative: 'yes' }]
        }
    ],
};

const PRIMARY_FIELDS = ['name', 'reportDate', 'totalInspections'];

// Reusable InputField component
const InputField = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={placeholder}
            required={required}
            disabled={disabled}
        />
    </div>
);

// Main Form Modal Component
const BenchmarkFormModal = ({ isOpen, onClose, onSubmit, isLoading, editData = null }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [isEditMode, setIsEditMode] = useState(false);

    // Initialize form data when editData changes or modal opens
    useEffect(() => {
        if (editData && isOpen) {
            console.log("Edit Data Received:", editData);
            setIsEditMode(true);

            // 1. Initialize transformed data with top-level fields
            const transformedData = {
                name: editData.name || "",
                // Note: reportDate logic might need review if different per vesselInspection. 
                // Using the first one for consistency with current code.
                reportDate: editData?.vesselInspections?.[0]?.report_date || "",
                totalInspections: editData.totalInspections || 0,
                inspectionDetails: []
            };

            // 2. AGGREGATE ALL QUESTIONS FROM ALL VESSEL INSPECTIONS
            let allQuestions = [];
            if (editData.vesselInspections && editData.vesselInspections.length > 0) {
                // Use flatMap to combine all questions from all vesselInspections into one array
                allQuestions = editData.vesselInspections.flatMap(
                    (inspection) => inspection.benchmark_inspection_questions || []
                );
            }

            // 3. Transform the aggregated questions into the form's inspectionDetails structure
            transformedData.inspectionDetails = allQuestions.map(question => ({
                chapterNo: question.chapter_no || "",
                viq: question.viq || question.viq_id || "",
                tag: question.tag || "",
                negativeEntries: question.benchmark_inspection_scores?.map(score => ({
                    category: score.category || "",
                    isNegative: score.isNegative || "yes"
                })) || [{ category: '', isNegative: 'yes' }]
            }));

            // Fallback for an empty array
            if (transformedData.inspectionDetails.length === 0) {
                transformedData.inspectionDetails = initialFormData.inspectionDetails;
            }

            // ... (rest of the logic for initialFormData/no editData)

            setFormData(transformedData);
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
        }
    }, [editData, isOpen]);

    const handleTopLevelChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'totalInspections' ? parseInt(value) || 0 : value,
        }));
    };

    const handleDetailChange = (index, e) => {
        const { name, value } = e.target;
        const newDetails = [...formData.inspectionDetails];
        newDetails[index] = { ...newDetails[index], [name]: value };
        setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
    };

    const handleNegativeEntryChange = (detailIndex, entryIndex, e) => {
        const { name, value } = e.target;
        const newDetails = [...formData.inspectionDetails];
        const newEntries = [...newDetails[detailIndex].negativeEntries];
        newEntries[entryIndex] = { ...newEntries[entryIndex], [name]: value };
        newDetails[detailIndex].negativeEntries = newEntries;
        setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
    };

    const addDetail = () => {
        setFormData(prev => ({
            ...prev,
            inspectionDetails: [
                ...prev.inspectionDetails,
                { chapterNo: '', viq: '', tag: '', negativeEntries: [{ category: '', isNegative: 'yes' }] },
            ],
        }));
    };

    const removeDetail = (index) => {
        const newDetails = formData.inspectionDetails.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
    };

    const addNegativeEntry = (detailIndex) => {
        const newDetails = [...formData.inspectionDetails];
        newDetails[detailIndex].negativeEntries.push({ category: '', isNegative: 'yes' });
        setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
    };

    const removeNegativeEntry = (detailIndex, entryIndex) => {
        const newDetails = [...formData.inspectionDetails];
        const newEntries = newDetails[detailIndex].negativeEntries.filter((_, i) => i !== entryIndex);
        newDetails[detailIndex].negativeEntries = newEntries;
        setFormData(prev => ({ ...prev, inspectionDetails: newDetails }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.reportDate) {
            alert('Please ensure Benchmark Name, Report Date, and Total Inspections are valid.');
            return;
        }

        const cleanedDetails = formData.inspectionDetails
            .filter(d => d.chapterNo && d.viq)
            .map(d => ({
                ...d,
                negativeEntries: d.negativeEntries.filter(n => n.category),
            }));

        const submissionData = { ...formData, inspectionDetails: cleanedDetails };

        if (isEditMode && editData?.id) {
            submissionData.id = editData.id;
        }

        await onSubmit(submissionData, isEditMode);
        setFormData(initialFormData);
        onClose();
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setIsEditMode(false);
        editData = null;
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity duration-300 flex justify-center items-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative m-4 transform transition-all duration-300">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {isEditMode ? 'Edit Benchmark Data' : 'Add New Benchmark Data (Aggregated)'}
                </h2>
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
                    {/* --- 1. PRIMARY FIELDS --- */}
                    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                        <p className="text-md font-bold text-blue-700">1. Primary Benchmark Information</p>
                        <InputField
                            label="Benchmark Name"
                            name="name"
                            value={formData.name}
                            onChange={handleTopLevelChange}
                            placeholder="e.g., Annual Safety"
                            required={PRIMARY_FIELDS.includes('name')}
                            disabled={isLoading}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <InputField
                                label="Report Date"
                                name="reportDate"
                                value={formData.reportDate}
                                onChange={handleTopLevelChange}
                                type="date"
                                required={PRIMARY_FIELDS.includes('reportDate')}
                                disabled={isLoading}
                            />
                            <InputField
                                label="Total Inspections Count"
                                name="totalInspections"
                                value={formData.totalInspections}
                                onChange={handleTopLevelChange}
                                type="number"
                                placeholder="0"
                                required={PRIMARY_FIELDS.includes('totalInspections')}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* --- 2. AGGREGATED INSPECTION DETAILS --- */}
                    <div className="p-4 border rounded-lg bg-white shadow-inner">
                        <p className="text-md font-bold text-blue-700 mb-4">2. Aggregated Inspection Details (Observations)</p>

                        {formData.inspectionDetails.map((detail, detailIndex) => (
                            <div key={detailIndex} className="p-3 border border-dashed border-gray-300 rounded-lg mb-4 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-800">Observation/Question #{detailIndex + 1}</h4>
                                    {formData.inspectionDetails.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeDetail(detailIndex)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                            disabled={isLoading}
                                        >
                                            Remove Observation
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputField
                                        label="Chapter No"
                                        name="chapterNo"
                                        value={detail.chapterNo}
                                        onChange={(e) => handleDetailChange(detailIndex, e)}
                                        placeholder="e.g., 5"
                                        disabled={isLoading}
                                        required
                                    />
                                    <InputField
                                        label="VIQ"
                                        name="viq"
                                        value={detail.viq}
                                        onChange={(e) => handleDetailChange(detailIndex, e)}
                                        placeholder="e.g., 5.6.1"
                                        disabled={isLoading}
                                        required
                                    />
                                    <div>
                                        <label className="block text-sm font-semibold text-blue-800 mb-1">Tag</label>
                                        <select
                                            name="tag"
                                            value={detail.tag}
                                            onChange={(e) => handleDetailChange(detailIndex, e)}
                                            className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
                                        >
                                            <option value="">Select Tag</option>
                                            <option value="Core">Core</option>
                                            <option value="Rotational 1">Rotational 1</option>
                                            <option value="Rotational 2">Rotational 2</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Negative Entries */}
                                <div className="ml-4 pt-2 border-t mt-3">
                                    <p className="text-sm font-medium text-gray-600 mb-2">Negative Entries/Scores (for this Observation)</p>
                                    {detail.negativeEntries.map((entry, entryIndex) => (
                                        <div key={entryIndex} className="flex space-x-2 mb-2 items-center">
                                            <div className="w-full">
                                                <label className="block text-xs font-semibold text-blue-800 mb-1">Category {entryIndex + 1}</label>
                                                <select
                                                    name="category"
                                                    value={entry.category}
                                                    onChange={(e) => handleNegativeEntryChange(detailIndex, entryIndex, e)}
                                                    className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
                                                >
                                                    <option value="">Select Category</option>
                                                    <option value="human">Human</option>
                                                    <option value="hardware">Hardware</option>
                                                    <option value="process">Process</option>
                                                    <option value="photo">Photo</option>
                                                </select>
                                            </div>
                                            <div className="w-1/4">
                                                <label className="block text-sm font-medium text-gray-700">Is Negative</label>
                                                <select
                                                    name="isNegative"
                                                    value={entry.isNegative}
                                                    onChange={(e) => handleNegativeEntryChange(detailIndex, entryIndex, e)}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    disabled={isLoading}
                                                >
                                                    <option value="yes">Yes</option>
                                                    <option value="no">No</option>
                                                </select>
                                            </div>

                                            {detail.negativeEntries.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeNegativeEntry(detailIndex, entryIndex)}
                                                    className="mt-5 text-red-500 hover:text-red-700"
                                                    disabled={isLoading}
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addNegativeEntry(detailIndex)}
                                        className="mt-2 py-1 px-3 rounded-md border border-green-500 text-green-600 text-xs hover:bg-green-50 transition"
                                        disabled={isLoading}
                                    >
                                        + Add Score Entry
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addDetail}
                            className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition duration-150 mt-4"
                            disabled={isLoading}
                        >
                            + Add New Observation Detail
                        </button>
                    </div>

                    {/* --- SUBMIT BUTTON --- */}
                    <div className="pt-4 border-t mt-4">
                        <button
                            type="submit"
                            className="w-full py-2.5 px-4 rounded-md shadow-md text-base font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition duration-150 flex items-center justify-center disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            )}
                            {isLoading ? 'Saving...' : (isEditMode ? 'Update Benchmark' : 'Save Benchmark')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BenchmarkFormModal;
