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
    const [dataEntryList ] = useFetchDataEntryListMutation();
    const [viewInspection, { isLoading: isFetching }] = useViewInspectionMutation();
    const [inspectionData, setInspectionData] = useState(null);

    const { handleSubmit, register, reset } = useForm();

    // Fetch inspection data when drawer opens
    const fetchInspectionData = async () => {
        try {
            const response = await viewInspection(inspectionId).unwrap();
            const dataentrylist = await dataEntryList().unwrap();
            console.log(dataentrylist);
            
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

                                {/* Master Field */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Master</label>
                                    <div className="relative">
                                        <input
                                            {...register('master')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter master name"
                                        />
                                    </div>
                                </div>
                                
                                {/* Vessel Sup Field */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Superintendent</label>
                                    <div className="relative">
                                        <input
                                            {...register('vessel_sup_name')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter Superintendent name"
                                        />
                                    </div>
                                </div>

                                {/* Chief Engineer Field */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Chief Engineer</label>
                                    <div className="relative">
                                        <input
                                            {...register('cheif_engineer_name')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter chief engineer name"
                                        />
                                    </div>
                                </div>

                                {/* Inspector Field */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Inspector</label>
                                    <div className="relative">
                                        <input
                                            {...register('inspector')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter inspector name"
                                        />
                                    </div>
                                </div>

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