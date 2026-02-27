// import React, { Fragment, useState, useEffect } from 'react';
// import { useForm } from 'react-hook-form';
// import { useDispatch } from 'react-redux';
// import { Drawer } from '@mui/material';
// import { X, Edit2, Check, UserRoundPen } from 'lucide-react';
// import { setVesselCheifEngName } from '../../redux/reducers/dataReducers';
// import { useUpdateInspectionDetailsMutation } from '../../redux/services/inspectionApi';
// import { useViewInspectionMutation } from '../../redux/services/vesselApi';
// import { Tooltip } from 'antd';

// const InspectionDataDrawer = ({ inspectionId }) => {
//     const [open, setOpen] = useState(false);
//     const [supName, setSupName] = useState('');
//     const dispatch = useDispatch();
//     const [updateInspectionDetails, { isLoading: isUpdating }] = useUpdateInspectionDetailsMutation();
//     const [viewInspection, { isLoading: isFetching }] = useViewInspectionMutation();
//     const [inspectionData, setInspectionData] = useState(null);

//     const { handleSubmit, register, reset } = useForm();

//     // Fetch inspection data when drawer opens
//     const fetchInspectionData = async () => {
//         try {
//             const response = await viewInspection(inspectionId).unwrap();
//             if (response?.success) {
//                 setInspectionData(response.vesselInspection);
//                 reset({
//                     cheif_engineer_name: response.vesselInspection?.cheif_engineer_name || '',
//                     inspector: response.vesselInspection?.inspector || '',
//                     master: response.vesselInspection?.master || '',
//                     company_name: response.vesselInspection?.company_name || '',
//                     port_name: response.vesselInspection?.port_name || '',
//                     country: response.vesselInspection?.country || '',
//                     vessel_sup_name: response.vesselInspection?.vessel_sup_name || '',
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching inspection data:', error);
//         }
//     };

//     useEffect(() => {
//         if (open && inspectionId) {
//             fetchInspectionData();
//         }
//     }, [open, inspectionId]);

//     const toggleDrawer = (open) => (event) => {
//         if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
//             return;
//         }
//         setOpen(open);
//         if (!open) {
//             reset();
//             setInspectionData(null);
//         }
//     };

//     const onSubmit = async (data) => {
//         try {
//             const res = await updateInspectionDetails({
//                 id: inspectionId,
//                 ...data
//             }).unwrap();

//             if (res?.success) {
//                 dispatch(setVesselCheifEngName(res?.data?.cheif_engineer_name));
//                 setOpen(false);
//             }
//         } catch (error) {
//             console.error('Update error:', error);
//         }
//     };

//     return (
//         <Fragment>
//             <Tooltip title="To add additional info not covered in the report." overlayStyle={{ maxWidth: 250 }}>
//                 <button
//                     onClick={toggleDrawer(true)}
//                     className="inline-flex items-center justify-center min-w-[80px] px-3 py-3
//                 bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
//                 transition-all duration-300 hover:scale-105 active:scale-95
//                 focus:outline-none focus:ring-4 focus:ring-blue-300/30"
//                 >
//                     <UserRoundPen className="w-4 h-4 mr-2" />
//                     Additional Data Entry
//                 </button>
//             </Tooltip>

//             <Drawer
//                 anchor="right"
//                 open={open}
//                 onClose={toggleDrawer(false)}
//                 sx={{
//                     '& .MuiDrawer-paper': {
//                         width: '400px',
//                         maxWidth: '100vw',
//                         backgroundColor: '#f8fafc',
//                         padding: '24px'
//                     },
//                 }}
//             >
//                 <div className="h-full flex flex-col">
//                     <div className="flex justify-between items-center mb-6">
//                         <h2 className="text-xl font-bold text-gray-800">Inspection Data</h2>
//                         <button
//                             onClick={toggleDrawer(false)}
//                             className="p-1 rounded-full hover:bg-gray-200 transition-colors"
//                         >
//                             <X className="w-5 h-5 text-gray-500" />
//                         </button>
//                     </div>

//                     {isFetching ? (
//                         <div className="flex-1 flex items-center justify-center">
//                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//                         </div>
//                     ) : (
//                         <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
//                             <div className="space-y-4 mb-6">

//                                 <div className="space-y-1">
//                                     <span className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">Superintendent:</span>{" "}
//                                     <h4 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">
//                                         {inspectionData?.superintendent?.name || "Superintendent"}
//                                     </h4>
//                                 </div>

//                                 {/* Master Field */}
//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Master</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('master')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter master name"
//                                         />
//                                     </div>
//                                 </div>
                                
//                                 {/* Vessel Sup Field */}
//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Superintendent</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('vessel_sup_name')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter Superintendent name"
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Chief Engineer Field */}
//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Chief Engineer</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('cheif_engineer_name')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter chief engineer name"
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Inspector Field */}
//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Inspector</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('inspector')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter inspector name"
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Company Name Field */}
//                                 {/* <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Inspecting Company</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('company_name')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter company name"
//                                         />
//                                     </div>
//                                 </div> */}

//                                 {/* Port Name Field */}
//                                 {/* <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Port</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('port_name')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter port name"
//                                         />
//                                     </div>
//                                 </div> */}

//                                 {/* Country Field */}
//                                 {/* <div className="space-y-1">
//                                     <label className="block text-sm font-medium text-gray-700">Country</label>
//                                     <div className="relative">
//                                         <input
//                                             {...register('country')}
//                                             type="text"
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter country name"
//                                         />
//                                     </div>
//                                 </div> */}

//                             </div>

//                             <div className="mt-auto pt-4 border-t border-gray-200">
//                                 <button
//                                     type="submit"
//                                     disabled={isUpdating}
//                                     className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                                 >
//                                     {isUpdating ? (
//                                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                         </svg>
//                                     ) : (
//                                         <Check className="w-4 h-4 mr-2" />
//                                     )}
//                                     Save Changes
//                                 </button>
//                             </div>
//                         </form>
//                     )}
//                 </div>
//             </Drawer>
//         </Fragment>
//     );
// };

// export default InspectionDataDrawer;





// import React, { Fragment, useState, useEffect, useRef } from 'react';
// import { useForm } from 'react-hook-form';
// import { useDispatch } from 'react-redux';
// import { Drawer } from '@mui/material';
// import { X, Edit2, Check, UserRoundPen, Search, Plus, Edit } from 'lucide-react';
// import { setVesselCheifEngName } from '../../redux/reducers/dataReducers';
// import { useFetchDataEntryListMutation, useUpdateInspectionDetailsMutation } from '../../redux/services/inspectionApi';
// import { useViewInspectionMutation } from '../../redux/services/vesselApi';
// import { Tooltip } from 'antd';

// const InspectionDataDrawer = ({ inspectionId }) => {
//     const [open, setOpen] = useState(false);
//     const [supName, setSupName] = useState('');
//     const dispatch = useDispatch();
//     const [updateInspectionDetails, { isLoading: isUpdating }] = useUpdateInspectionDetailsMutation();
//     const [dataEntryList] = useFetchDataEntryListMutation();
//     const [viewInspection, { isLoading: isFetching }] = useViewInspectionMutation();
//     const [inspectionData, setInspectionData] = useState(null);
//     const [dataEntries, setDataEntries] = useState({
//         inspectors: [],
//         masters: [],
//         chief_engineers: [],
//         superintendents: []
//     });

//     // State for dropdowns
//     const [dropdownStates, setDropdownStates] = useState({
//         master: { open: false, search: '', filtered: [], editing: false },
//         vessel_sup_name: { open: false, search: '', filtered: [], editing: false },
//         cheif_engineer_name: { open: false, search: '', filtered: [], editing: false },
//         inspector: { open: false, search: '', filtered: [], editing: false }
//     });

//     const { handleSubmit, register, reset, setValue, watch } = useForm();
//     const dropdownRefs = useRef({});

//     // Watch form values
//     const formValues = watch();

//     // Fetch inspection data when drawer opens
//     const fetchInspectionData = async () => {
//         try {
//             const response = await viewInspection(inspectionId).unwrap();
//             const dataentrylist = await dataEntryList().unwrap();

//             console.log("Data Entry List:", dataentrylist);

//             if (dataentrylist?.success) {
//                 setDataEntries(dataentrylist.data);
//             }

//             if (response?.success) {
//                 setInspectionData(response.vesselInspection);
//                 reset({
//                     cheif_engineer_name: response.vesselInspection?.cheif_engineer_name || '',
//                     inspector: response.vesselInspection?.inspector || '',
//                     master: response.vesselInspection?.master || '',
//                     company_name: response.vesselInspection?.company_name || '',
//                     port_name: response.vesselInspection?.port_name || '',
//                     country: response.vesselInspection?.country || '',
//                     vessel_sup_name: response.vesselInspection?.vessel_sup_name || '',
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching inspection data:', error);
//         }
//     };

//     useEffect(() => {
//         if (open && inspectionId) {
//             fetchInspectionData();
//         }
//     }, [open, inspectionId]);

//     // Close dropdown when clicking outside
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             Object.keys(dropdownRefs.current).forEach(fieldName => {
//                 if (dropdownRefs.current[fieldName] &&
//                     !dropdownRefs.current[fieldName].contains(event.target) &&
//                     dropdownStates[fieldName]?.open) {
//                     setDropdownStates(prev => ({
//                         ...prev,
//                         [fieldName]: {
//                             ...prev[fieldName],
//                             open: false,
//                             editing: false,
//                             search: ''
//                         }
//                     }));
//                 }
//             });
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, [dropdownStates]);

//     const toggleDrawer = (open) => (event) => {
//         if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
//             return;
//         }
//         setOpen(open);
//         if (!open) {
//             reset();
//             setInspectionData(null);
//             // Reset all dropdowns
//             setDropdownStates({
//                 master: { open: false, search: '', filtered: [], editing: false },
//                 vessel_sup_name: { open: false, search: '', filtered: [], editing: false },
//                 cheif_engineer_name: { open: false, search: '', filtered: [], editing: false },
//                 inspector: { open: false, search: '', filtered: [], editing: false }
//             });
//         }
//     };

//     // Toggle dropdown
//     const toggleDropdown = (fieldName) => {
//         const currentValue = formValues[fieldName] || '';
//         const dataKey = getDataEntryKey(fieldName);
//         let filteredItems = dataEntries[dataKey] || [];

//         // If there's a current value, include it in the filtered list
//         if (currentValue && !filteredItems.includes(currentValue)) {
//             filteredItems = [currentValue, ...filteredItems];
//         }

//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 open: !prev[fieldName].open,
//                 search: currentValue, // Pre-fill search with current value
//                 filtered: filteredItems,
//                 editing: false
//             }
//         }));
//     };

//     // Handle search in dropdown
//     const handleSearch = (fieldName, searchTerm) => {
//         const dataKey = getDataEntryKey(fieldName);
//         const currentValue = formValues[fieldName] || '';
//         let allItems = dataEntries[dataKey] || [];

//         // Include current value in the list if it's not already there
//         if (currentValue && !allItems.includes(currentValue)) {
//             allItems = [currentValue, ...allItems];
//         }

//         const filteredItems = allItems.filter(item =>
//             item.toLowerCase().includes(searchTerm.toLowerCase())
//         );

//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 search: searchTerm,
//                 filtered: filteredItems
//             }
//         }));
//     };

//     // Select item from dropdown
//     const selectItem = (fieldName, item) => {
//         setValue(fieldName, item);
//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 open: false,
//                 search: '',
//                 editing: false
//             }
//         }));
//     };

//     // Enable editing mode
//     const enableEditing = (fieldName) => {
//         const currentValue = formValues[fieldName] || '';
//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 search: currentValue,
//                 editing: true
//             }
//         }));
//     };

//     // Add new manual entry or update existing
//     const saveManualEntry = (fieldName) => {
//         const searchTerm = dropdownStates[fieldName].search.trim();
//         if (searchTerm) {
//             setValue(fieldName, searchTerm);
//             setDropdownStates(prev => ({
//                 ...prev,
//                 [fieldName]: {
//                     ...prev[fieldName],
//                     open: false,
//                     search: '',
//                     editing: false
//                 }
//             }));
//         }
//     };

//     // Cancel editing
//     const cancelEditing = (fieldName) => {
//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 search: formValues[fieldName] || '',
//                 editing: false
//             }
//         }));
//     };

//     // Clear field value
//     const clearField = (fieldName) => {
//         setValue(fieldName, '');
//         setDropdownStates(prev => ({
//             ...prev,
//             [fieldName]: {
//                 ...prev[fieldName],
//                 search: '',
//                 editing: false
//             }
//         }));
//     };

//     // Map form field names to data entry keys
//     const getDataEntryKey = (fieldName) => {
//         const mapping = {
//             'master': 'masters',
//             'vessel_sup_name': 'superintendents',
//             'cheif_engineer_name': 'chief_engineers',
//             'inspector': 'inspectors'
//         };
//         return mapping[fieldName] || fieldName;
//     };

//     // Get field label
//     const getFieldLabel = (fieldName) => {
//         const labels = {
//             'master': 'Master',
//             'vessel_sup_name': 'Superintendent',
//             'cheif_engineer_name': 'Chief Engineer',
//             'inspector': 'Inspector'
//         };
//         return labels[fieldName] || fieldName;
//     };

//     const onSubmit = async (data) => {
//         try {
//             const res = await updateInspectionDetails({
//                 id: inspectionId,
//                 ...data
//             }).unwrap();

//             if (res?.success) {
//                 dispatch(setVesselCheifEngName(res?.data?.cheif_engineer_name));
//                 setOpen(false);
//             }
//         } catch (error) {
//             console.error('Update error:', error);
//         }
//     };

//     // Custom Input Field Component
//     const CustomDropdownField = ({ fieldName }) => {
//         const dropdownState = dropdownStates[fieldName];
//         const currentValue = formValues[fieldName] || '';
//         const dataKey = getDataEntryKey(fieldName);
//         const items = dataEntries[dataKey] || [];
//         const hasValue = Boolean(currentValue);

//         return (
//             <div className="space-y-1 relative" ref={el => dropdownRefs.current[fieldName] = el}>
//                 <label className="block text-sm font-medium text-gray-700">
//                     {getFieldLabel(fieldName)}
//                 </label>
//                 <div className="relative">
//                     <input
//                         {...register(fieldName)}
//                         type="text"
//                         value={currentValue}
//                         readOnly={!dropdownState.editing}
//                         onChange={(e) => {
//                             if (dropdownState.editing) {
//                                 setValue(fieldName, e.target.value);
//                                 handleSearch(fieldName, e.target.value);
//                             }
//                         }}
//                         onFocus={() => !dropdownState.editing && toggleDropdown(fieldName)}
//                         className={`w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20 ${dropdownState.editing ? 'bg-white' : 'bg-gray-50'
//                             }`}
//                         placeholder={`Enter ${getFieldLabel(fieldName).toLowerCase()} name`}
//                     />

//                     {/* Action Buttons */}
//                     <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
//                         {hasValue && !dropdownState.editing && (
//                             <>
//                                 <button
//                                     type="button"
//                                     onClick={() => enableEditing(fieldName)}
//                                     className="text-blue-500 hover:text-blue-700 transition-colors p-1"
//                                     title="Edit"
//                                 >
//                                     <Edit className="w-3 h-3" />
//                                 </button>
//                                 <button
//                                     type="button"
//                                     onClick={() => clearField(fieldName)}
//                                     className="text-red-500 hover:text-red-700 transition-colors p-1"
//                                     title="Clear"
//                                 >
//                                     <X className="w-3 h-3" />
//                                 </button>
//                             </>
//                         )}
//                         <button
//                             type="button"
//                             onClick={() => toggleDropdown(fieldName)}
//                             className="text-gray-400 hover:text-gray-600 transition-colors p-1"
//                             title="Browse options"
//                         >
//                             <Search className="w-4 h-4" />
//                         </button>
//                     </div>
//                 </div>

//                 {/* Dropdown */}
//                 {dropdownState.open && (
//                     <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//                         {/* Search Input */}
//                         <div className="p-2 border-b border-gray-200">
//                             <div className="relative">
//                                 <input
//                                     type="text"
//                                     value={dropdownState.search}
//                                     onChange={(e) => handleSearch(fieldName, e.target.value)}
//                                     className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
//                                     placeholder={`Search ${getFieldLabel(fieldName).toLowerCase()}...`}
//                                     autoFocus
//                                 />
//                                 <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
//                             </div>
//                         </div>

//                         {/* Items List */}
//                         <div className="max-h-40 overflow-y-auto">
//                             {dropdownState.filtered.length > 0 ? (
//                                 dropdownState.filtered.map((item, index) => (
//                                     <button
//                                         key={index}
//                                         type="button"
//                                         onClick={() => selectItem(fieldName, item)}
//                                         className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 flex justify-between items-center ${item === currentValue ? 'bg-blue-50 text-blue-700 font-medium' : ''
//                                             }`}
//                                     >
//                                         <span>{item}</span>
//                                         {item === currentValue && (
//                                             <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
//                                                 Current
//                                             </span>
//                                         )}
//                                     </button>
//                                 ))
//                             ) : (
//                                 <div className="px-3 py-2 text-sm text-gray-500 text-center">
//                                     No {getFieldLabel(fieldName).toLowerCase()} found
//                                 </div>
//                             )}
//                         </div>

//                         {/* Manual Entry Option */}
//                         {dropdownState.search.trim() && (
//                             <div className="p-2 border-t border-gray-200 bg-gray-50">
//                                 <button
//                                     type="button"
//                                     onClick={() => saveManualEntry(fieldName)}
//                                     className="w-full flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
//                                 >
//                                     <Plus className="w-3 h-3 mr-1" />
//                                     {currentValue ? `Update to "${dropdownState.search}"` : `Add "${dropdownState.search}"`}
//                                 </button>
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {/* Editing Mode Overlay */}
//                 {dropdownState.editing && (
//                     <div className="absolute inset-0 bg-white border border-blue-500 rounded-lg shadow-lg p-2 z-20">
//                         <div className="flex items-center space-x-2">
//                             <input
//                                 type="text"
//                                 value={dropdownState.search}
//                                 onChange={(e) => {
//                                     setDropdownStates(prev => ({
//                                         ...prev,
//                                         [fieldName]: {
//                                             ...prev[fieldName],
//                                             search: e.target.value
//                                         }
//                                     }));
//                                     setValue(fieldName, e.target.value);
//                                 }}
//                                 className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
//                                 autoFocus
//                             />
//                             <button
//                                 type="button"
//                                 onClick={() => saveManualEntry(fieldName)}
//                                 className="p-1 text-green-500 hover:text-green-700"
//                                 title="Save"
//                             >
//                                 <Check className="w-4 h-4" />
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={() => cancelEditing(fieldName)}
//                                 className="p-1 text-red-500 hover:text-red-700"
//                                 title="Cancel"
//                             >
//                                 <X className="w-4 h-4" />
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     return (
//         <Fragment>
//             <Tooltip title="To add additional info not covered in the report." overlayStyle={{ maxWidth: 250 }}>
//                 <button
//                     onClick={toggleDrawer(true)}
//                     className="inline-flex items-center justify-center min-w-[80px] px-3 py-3
//                 bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
//                 transition-all duration-300 hover:scale-105 active:scale-95
//                 focus:outline-none focus:ring-4 focus:ring-blue-300/30"
//                 >
//                     <UserRoundPen className="w-4 h-4 mr-2" />
//                     Additional Data Entry
//                 </button>
//             </Tooltip>

//             <Drawer
//                 anchor="right"
//                 open={open}
//                 onClose={toggleDrawer(false)}
//                 sx={{
//                     '& .MuiDrawer-paper': {
//                         width: '400px',
//                         maxWidth: '100vw',
//                         backgroundColor: '#f8fafc',
//                         padding: '24px'
//                     },
//                 }}
//             >
//                 <div className="h-full flex flex-col">
//                     <div className="flex justify-between items-center mb-6">
//                         <h2 className="text-xl font-bold text-gray-800">Inspection Data</h2>
//                         <button
//                             onClick={toggleDrawer(false)}
//                             className="p-1 rounded-full hover:bg-gray-200 transition-colors"
//                         >
//                             <X className="w-5 h-5 text-gray-500" />
//                         </button>
//                     </div>

//                     {isFetching ? (
//                         <div className="flex-1 flex items-center justify-center">
//                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//                         </div>
//                     ) : (
//                         <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
//                             <div className="space-y-4 mb-6">

//                                 <div className="space-y-1">
//                                     <span className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">Superintendent:</span>{" "}
//                                     <h4 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">
//                                         {inspectionData?.superintendent?.name || "Superintendent"}
//                                     </h4>
//                                 </div>

//                                 {/* Master Field */}
//                                 <CustomDropdownField fieldName="master" />
//                                 {/* Vessel Sup Field */}
//                                 <CustomDropdownField fieldName="vessel_sup_name" />
//                                 {/* Chief Engineer Field */}
//                                 <CustomDropdownField fieldName="cheif_engineer_name" />
//                                 {/* Inspector Field */}
//                                 <CustomDropdownField fieldName="inspector" />
//                             </div>

//                             <div className="mt-auto pt-4 border-t border-gray-200">
//                                 <button
//                                     type="submit"
//                                     disabled={isUpdating}
//                                     className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                                 >
//                                     {isUpdating ? (
//                                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                         </svg>
//                                     ) : (
//                                         <Check className="w-4 h-4 mr-2" />
//                                     )}
//                                     Save Changes
//                                 </button>
//                             </div>
//                         </form>
//                     )}
//                 </div>
//             </Drawer>
//         </Fragment>
//     );
// };

// export default InspectionDataDrawer;


import React, { Fragment, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { Drawer } from '@mui/material';
import { X, Edit2, Check, UserRoundPen } from 'lucide-react';
import { setVesselCheifEngName } from '../../redux/reducers/dataReducers';
import { useFetchDataEntryListMutation, useUpdateInspectionDetailsMutation } from '../../redux/services/inspectionApi';
import { useViewInspectionMutation } from '../../redux/services/vesselApi';
import { Tooltip } from 'antd';

const InspectionDataDrawer = ({ inspectionId }) => {
    const [open, setOpen] = useState(false);
    const [supName, setSupName] = useState('');
    const dispatch = useDispatch();
    const [updateInspectionDetails, { isLoading: isUpdating }] = useUpdateInspectionDetailsMutation();
    const [viewInspection, { isLoading: isFetching }] = useViewInspectionMutation();
    const [dataEntryList] = useFetchDataEntryListMutation();
    const [dataEntry, setDataEntry] = useState(null);
    const [master, setMaster] = useState('');
    const [inspector, setInspector] = useState('');
    const [cheifEngineerName, setCheifEngineerName] = useState('');
    const [superintendent, setSuperintendent] = useState('');
    const [inspectionData, setInspectionData] = useState(null);

    const { handleSubmit, register, reset } = useForm();

    // Fetch inspection data when drawer opens
    const fetchInspectionData = async () => {
        try {
            const response = await viewInspection(inspectionId).unwrap();
            if (response?.success) {
                setInspectionData(response.vesselInspection);
                reset({
                    cheif_engineer_name: response.vesselInspection?.cheif_engineer_name || '',
                    inspector: response.vesselInspection?.inspector || '',
                    master: response.vesselInspection?.master || '',
                    company_name: response.vesselInspection?.company_name || '',
                    port_name: response.vesselInspection?.port_name || '',
                    country: response.vesselInspection?.country || '',
                    vessel_sup_name: response.vesselInspection?.vessel_sup_name || '',
                });
            }
            const res = await dataEntryList(inspectionId).unwrap();
            if (res?.success) {
                setDataEntry(res?.data);
                setMaster(res?.data?.masters);
                setInspector(res?.data?.inspectors);
                setCheifEngineerName(res?.data?.chief_engineers);
                setSuperintendent(res?.data?.superintendents);
            }
        } catch (error) {
            console.error('Error fetching inspection data:', error);
        }
    };

    useEffect(() => {
        if (open && inspectionId) {
            fetchInspectionData();
        }
    }, [open, inspectionId]);

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setOpen(open);
        if (!open) {
            reset();
            setInspectionData(null);
        }
    };

    const onSubmit = async (data) => {
        try {
            const res = await updateInspectionDetails({
                id: inspectionId,
                ...data
            }).unwrap();

            if (res?.success) {
                dispatch(setVesselCheifEngName(res?.data?.cheif_engineer_name));
                setOpen(false);
            }
        } catch (error) {
            console.error('Update error:', error);
        }
    };

    const TextDropdown = ({ label, name, options, register }) => {
        const [filtered, setFiltered] = useState([]);
        const [value, setValue] = useState("");

        const handleChange = (e) => {
            const val = e.target.value;
            setValue(val);

            if (val.trim() === "") {
                setFiltered([]); // hide list if input is empty
            } else {
                setFiltered(options.filter(o => o.toLowerCase().includes(val.toLowerCase())));
            }
        };

        return (
            <div className="space-y-1 relative">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input
                    {...register(name)}
                    value={value}
                    onChange={handleChange}
                    onBlur={() => setFiltered([])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${label.toLowerCase()} name`}
                />
                {filtered.length > 0 && (
                    <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg w-full mt-1 max-h-40 overflow-y-auto shadow-md">
                        {filtered.map((f, i) => (
                            <li
                                key={i}
                                onClick={() => {
                                    setValue(f);
                                    setFiltered([]);
                                }}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                            >
                                {f}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };


    return (
        <Fragment>
            <Tooltip title="To add additional info not covered in the report." overlayStyle={{ maxWidth: 250 }}>
                <button
                    onClick={toggleDrawer(true)}
                    className="inline-flex items-center justify-center min-w-[80px] px-3 py-3
                bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                transition-all duration-300 hover:scale-105 active:scale-95
                focus:outline-none focus:ring-4 focus:ring-blue-300/30"
                >
                    <UserRoundPen className="w-4 h-4 mr-2" />
                    Additional Data Entry
                </button>
            </Tooltip>

            <Drawer
                anchor="right"
                open={open}
                onClose={toggleDrawer(false)}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: '400px',
                        maxWidth: '100vw',
                        backgroundColor: '#f8fafc',
                        padding: '24px'
                    },
                }}
            >
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Inspection Data</h2>
                        <button
                            onClick={toggleDrawer(false)}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {isFetching ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                            <div className="space-y-4 mb-6">

                                <div className="space-y-1">
                                    <span className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">Superintendent:</span>{" "}
                                    <h4 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-500 inline-block pb-1">
                                        {inspectionData?.superintendent?.name || "Superintendent"}
                                    </h4>
                                </div>

                                <TextDropdown
                                    label="Master"
                                    name="master"
                                    options={dataEntry?.masters || []}
                                    register={register}
                                />
                                <TextDropdown
                                    label="Chief Engineer"
                                    name="cheif_engineer_name"
                                    options={dataEntry?.chief_engineers || []}
                                    register={register}
                                />
                                <TextDropdown
                                    label="Inspector"
                                    name="inspector"
                                    options={dataEntry?.inspectors || []}
                                    register={register}
                                />
                                <TextDropdown
                                    label="Superintendent"
                                    name="vessel_sup_name"
                                    options={dataEntry?.superintendents || []}
                                    register={register}
                                />

                                {/* Company Name Field */}
                                {/* <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Inspecting Company</label>
                                    <div className="relative">
                                        <input
                                            {...register('company_name')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                </div> */}

                                {/* Port Name Field */}
                                {/* <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Port</label>
                                    <div className="relative">
                                        <input
                                            {...register('port_name')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter port name"
                                        />
                                    </div>
                                </div> */}

                                {/* Country Field */}
                                {/* <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Country</label>
                                    <div className="relative">
                                        <input
                                            {...register('country')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter country name"
                                        />
                                    </div>
                                </div> */}

                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Drawer>
        </Fragment>
    );
};

export default InspectionDataDrawer;