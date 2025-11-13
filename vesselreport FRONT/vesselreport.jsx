import React, { Fragment, useEffect, useState } from 'react';
import { Search, Eye, Trash2, Upload, Ship, Calendar, TrendingUp, BarChart3, Sparkles, Filter, SortDesc, Grid, List, Pencil, PencilIcon, UserRoundPen, FileText, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeleteInspectionMutation, useGetInspectionMutation, useGetInspectionsByVesselMutation, useVesselAndvesselInspectionCountMutation, useViewInspectionMutation } from '../../redux/services/vesselApi';
import { setData, setEditableData, setInspectionId, setVesselCheifEngName, setVesselName, setVesselReportDate } from '../../redux/reducers/dataReducers';
import { useDispatch, useSelector } from 'react-redux';
import { extractOtherTextNegatives } from '../../utils/extractOtherTextNegatives';
import Swal from 'sweetalert2';
import moment from 'moment/moment';
import Loader from '../../components/Loader';
import { RouteConstant } from '../../routes/RouteConstant';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import Tooltip from '@mui/material/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import useDebounce from '../../hooks/useDebounce';
import InspectionDataDrawer from '../InspectionData/InspectionDataDrawer';

const PremiumDeleteButton = ({ onDelete, isLoading = false, inspectionId, vesselId }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="group relative inline-flex items-center justify-center w-10 h-10 
        bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 
        hover:from-red-500 hover:via-rose-500 hover:to-pink-500 
        border border-red-300/30 hover:border-red-400 
        rounded-2xl shadow-lg hover:shadow-2xl
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-red-300/30
        hover:scale-110 active:scale-95
        overflow-hidden backdrop-blur-xl"
      onClick={() => onDelete(inspectionId, vesselId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      aria-label="Delete vessel"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-rose-500/20 to-pink-500/20 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent 
        -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      
      <div className="relative z-10 flex items-center justify-center">
        <Trash2 
          className={`w-4 h-4 transition-all duration-300 ${
            isHovered 
              ? 'text-white scale-125 rotate-12' 
              : 'text-red-500'
          }`} 
        />
      </div>
      
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-br from-orange-400 to-red-500 
        rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
      
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/95 to-rose-600/95 
          rounded-2xl flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </button>
  );
};

const VesselReport = () => {

  const [getInspection, {isLoading: isLoadingData}] = useGetInspectionMutation();
  const [viewInspection, {isLoading: isLoadingPreview}] = useViewInspectionMutation();
  const [deleteInspection, {isLoading: isLoadingDelete}] = useDeleteInspectionMutation();
  const [getInspectionByVessel, { data: vesselByData, isLoading: isLoadingByVessel }] = useGetInspectionsByVesselMutation();
  const [getVesselAndVesselInspectionCount, { data: vesselsCount }] = useVesselAndvesselInspectionCountMutation();

  const user = useSelector(state=> state.auth.user)
  const [result, setResult] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedVessel, setExapandedVessel] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    getData();
  }, [debouncedSearch]);

  const getData = async () => {
    const response = await getInspection({ search }).unwrap();
    setResult(response?.data);
    await getVesselAndVesselInspectionCount({}).unwrap();
    setIsLoading(false)
  };

  const handlePreview = async (element) => {
    dispatch(setVesselName(element?.vesselName));
    dispatch(setVesselReportDate(element?.inspectionDate));
    const reportResponse = await viewInspection(element?.id).unwrap();
    onGenerate(reportResponse);
  };

  const getInspectionDataByVessel = async(id)=> {
    await getInspectionByVessel({ id }).unwrap();
  }

  const handleInspections =async(id, count)=> {
    if(id === expandedVessel || count < 2){
      setExapandedVessel(null)
      return
    }
    setExapandedVessel(id)
    await getInspectionDataByVessel(id)
  }

  const onGenerate = async (reportResponse) => {
    if (reportResponse?.success) {
      const otherTextNegatives = extractOtherTextNegatives(reportResponse?.data);
      dispatch(setData(reportResponse?.data));
      dispatch(setEditableData(otherTextNegatives));
      if (otherTextNegatives.length > 0) {
        navigate(RouteConstant.MANUALSCORE);
        return;
      }
      navigate(RouteConstant.PREVIEW);
    }
  };
    const handleManualPreview = async (element) => {
    dispatch(setVesselName(element?.vesselName));
    dispatch(setVesselReportDate(element?.inspectionDate));
    dispatch(setInspectionId(element?.id));
    const reportResponse = await viewInspection(element?.id).unwrap();
    onGenerateManual(reportResponse);
    
  };
  const onGenerateManual = async (reportResponse) => {
    if (reportResponse?.success) {
      const otherTextNegatives = extractOtherTextNegatives(reportResponse?.data);
      dispatch(setData(reportResponse?.data));
      dispatch(setVesselCheifEngName(reportResponse?.vesselInspection?.cheif_engineer_name));
      dispatch(setEditableData(otherTextNegatives));
      navigate(RouteConstant.MANUALENTRY);
    }
  };

  const handleDelete = async (id, vessel_id) => {
    console.log(id, vessel_id)
    const result = await Swal.fire({
      title: 'Delete Vessel Report?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      width: '500px',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      backdrop: 'rgba(0,0,0,0.4)',
      customClass: {
        popup: 'rounded-3xl shadow-2xl',
        confirmButton: 'rounded-xl px-6 py-3',
        cancelButton: 'rounded-xl px-6 py-3'
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteInspection({ id }).unwrap();
        if (res.success) {
          await getData();
          await getInspectionDataByVessel(vessel_id)
          Swal.fire({
            title: 'Deleted!',
            text: 'Vessel report has been deleted.',
            icon: 'success',
            timer: 3000,
            timerProgressBar: true,
            customClass: {
              popup: 'rounded-3xl shadow-2xl'
            }
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete vessel report.',
          icon: 'error',
          customClass: {
            popup: 'rounded-3xl shadow-2xl'
          }
        });
      }
    }
  };

  return (
    <div className="min-h-screen">

        <div className="bg-white/80 backdrop-blur-2xl border-b border-white/20 shadow-xl rounded-4xl">
            <div className="px-4 py-4">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">

                    <div>
                      <div 
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-200 transition-colors"
                        > Total Vessel Count
                          <Ship size={14} className="text-blue-600" />
                          {/* <span className="text-sm font-medium text-blue-800">{result?.length ? result?.length : 0}</span> */}
                          <span className="text-sm font-medium text-blue-800">{vesselsCount?.data?.totalVessels || 0}</span>
                      </div>
                      <div 
                          className="inline-flex items-center gap-1 px-2 py-1 ml-2 bg-blue-100 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-200 transition-colors"
                        > Total Inspections Count
                          <FileText size={14} className="text-blue-600" />
                          {/* <span className="text-sm font-medium text-blue-800">{result?.length ? result?.length : 0}</span> */}
                          <span className="text-sm font-medium text-blue-800">{vesselsCount?.data?.totalInspections || 0}</span>
                      </div>
                    </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full md:w-96 group">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-sm group-focus-within:blur-md transition-all duration-300" />
                      <div className="relative">
                        <input
                        type="text"
                        placeholder="Search by vessels name..."
                        className="w-full h-[50px] pl-14 pr-6 rounded-2xl border-2 border-transparent bg-white/90 backdrop-blur-sm focus:outline-none focus:border-indigo-400 focus:bg-white shadow-lg transition-all duration-300 text-gray-800 placeholder:text-gray-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                            <Search className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        {search && (
                          <button
                          onClick={() => setSearch('')}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all duration-200"
                          >
                            <span className="text-gray-500 text-xs">✕</span>
                          </button>
                        )}
                      </div>
                    </div>

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
            </div>
        </div>

      {
        isLoading ?
        <Loader />:
        <div className="py-8">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead className="bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 backdrop-blur-xl">
                            <tr>
                                <th className="px-8 py-5 text-left text-blue-900 tracking-wider uppercase">
                                    Vessel
                                </th>
                                {/* {user?.id === 27 && */}
                                <th className="px-8 py-5 text-blue-900 tracking-wider uppercase text-center"> 
                                </th>
                                {/* } */}
                                <th className="px-8 py-5 text-blue-900 tracking-wider uppercase text-center">
                                    Total Score
                                </th>
                                <th className="px-8 py-5 text-blue-900 tracking-wider uppercase text-center">
                                    Core Score
                                </th>
                                <th className="px-8 py-5 text-blue-900 tracking-wider uppercase text-center">
                                    Rotational Score
                                </th>
                                <th className="px-8 py-5 text-blue-900 tracking-wider uppercase text-left">
                                    Inspection Date
                                </th>
                                <th className="w-16 px-8 py-5 text-left text-blue-900 tracking-wider uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 backdrop-blur-xl divide-y divide-gray-100/50">
                            {result?.map((vessel, index) => (
                                <>
                                  <tr
                                  key={vessel.id} 
                                  className={`hover:bg-blue-50/50 transition-all duration-300 group ${
                                  index % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30'
                                  }`}
                                  >
                                      <td className="px-8 py-3 whitespace-nowrap">
                                        <Tooltip title={`Previous Reports ${vessel?.vesselName}`} placement="right" arrow >
                                            <button onClick={()=> {handleInspections(vessel?.vessel_id, vessel?.countOfInspectionByVessel)}} className="flex items-center gap-4">
                                                <div
                                                className="relative w-9 h-9 bg-primary rounded-xl 
                                                flex items-center justify-center shadow-lg"
                                                >
                                                  <Ship size={17} color='#FFF' />
                                                  {
                                                    vessel?.countOfInspectionByVessel > 1 &&
                                                    <span className='absolute top-[-6px] right-[-6px] w-5 h-5 rounded-xl flex justify-center items-center bg-amber-400 text-white font-medium text-[12px]'>
                                                      {vessel?.countOfInspectionByVessel}
                                                    </span>
                                                  }
                                                </div>
                                                <div className="flex items-center gap-4 font-semibold text-[14px] text-gray-900 group-hover:text-blue-900 transition-colors">
                                                    {vessel?.vesselName}
                                                    {
                                                      vessel?.countOfInspectionByVessel > 1  && (
                                                      <IconChevronRight
                                                      size={17}
                                                      color="#093FB4"
                                                      style={{
                                                      transform: expandedVessel === vessel?.vessel_id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                      transition: 'transform 0.3s ease-in-out',
                                                      }}
                                                      />
                                                    )}
                                                </div>
                                            </button>
                                        </Tooltip>
                                      </td>

                                      {user?.id === 27 && vessel?.vessel_id === 228 ?
                                      (<td className="px-8 py-3 whitespace-nowrap text-center">
                                          <div className="text-gray-900">
                                                <button
                                                onClick={() => { navigate(RouteConstant.PREDICTION, { state: { vesselId: vessel?.vessel_id, vesselName: vessel?.vesselName } } )}}
                                                className="inline-flex items-center justify-center min-w-[60px] h-[5px] px-3 py-3
                                                bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                transition-all duration-300 hover:scale-105 active:scale-95
                                                focus:outline-none focus:ring-4 focus:ring-blue-300/30" 
                                                title="Predictive Insights of upcoming R1 and R2 VIQs."
                                              >
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Prediction
                                              </button>
{/* 
                                              <button
                                                onClick={() => { 
                                                  navigate(RouteConstant.PREDICTION, { 
                                                    state: { 
                                                      vesselId: vessel?.vessel_id, 
                                                      vesselName: vessel?.vesselName 
                                                    } 
                                                  }) 
                                                }}
                                                className="inline-flex items-center justify-center min-w-[20px] h-10 px-2 py-2
                                                          bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600
                                                          text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                          transition-all duration-300 hover:scale-105 active:scale-95
                                                          focus:outline-none focus:ring-4 focus:ring-sky-300/50
                                                          border border-white/20
                                                          animate-pulse hover:animate-none"
                                                title="Predictive Insights of upcoming R1 and R2 VIQs."
                                              >
                                                <Sparkles className="h-4 mr-2" />
                                                Predict
                                              </button> */}

                                          </div>
                                      </td>
                                      ) : (<td className="px-8 py-3 whitespace-nowrap text-center"></td>) }

                                      <td className="px-8 py-3 whitespace-nowrap text-center">
                                          <div className="text-gray-900">
                                              {vessel?.isManualScore ? (
                                              <span className="px-3 py-1 text-[12px] bg-amber-100 text-amber-800 rounded-full font-medium">
                                                  Manual Review
                                              </span>
                                              ) : (
                                              <span className="text-emerald-700 text-lg">{vessel.totalScore}</span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-8 py-3 whitespace-nowrap text-center">
                                          <div>
                                              {vessel?.isManualScore ? (
                                              <span className="text-amber-600">-</span>
                                              ) : (
                                              <span className="text-blue-700 text-lg">{vessel.coreScore}</span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-8 py-3 whitespace-nowrap text-center">
                                          <div>
                                              {vessel?.isManualScore ? (
                                              <span className="text-amber-600">-</span>
                                              ) : (
                                              <span className="text-purple-700 text-lg">{vessel.rotationalScore}</span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-8 py-3 text-[14px] whitespace-nowrap text-left">
                                          <div className="font-medium text-gray-900">
                                              {vessel.inspectionDate ? moment(vessel.inspectionDate).format('DD-MM-YYYY') : '-'}
                                          </div>
                                      </td>
                                      
                                      <td className="px-8 py-3 whitespace-nowrap text-center">
                                          <div className="flex items-center justify-end gap-4">


                                                <InspectionDataDrawer inspectionId={vessel?.id} />
                                                <button
                                                  onClick={() => handleManualPreview(vessel)}
                                                  className="inline-flex items-center justify-center px-3 py-3
                                                  bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                  transition-all duration-300 hover:scale-105 active:scale-95
                                                  focus:outline-none focus:ring-4 focus:ring-blue-300/30"
                                                  title="Review negative response"
                                                  >
                                                      <PencilIcon className="w-4 h-4 mr-2" />
                                                      Review
                                                  </button>

                                              
                                              <button
                                                onClick={() => handlePreview(vessel)}
                                                className="inline-flex items-center justify-center min-w-[130px] px-3 py-3
                                                bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                transition-all duration-300 hover:scale-105 active:scale-95
                                                focus:outline-none focus:ring-4 focus:ring-blue-300/30" 
                                              >
                                                <Ship className="w-4 h-4 mr-2" />
                                                {vessel?.isManualScore ? 'Manual Scoring' : 'Vessel Insights'}
                                              </button>

                                              <PremiumDeleteButton 
                                              onDelete={handleDelete}
                                              isLoading={isLoadingDelete} 
                                              inspectionId={vessel?.id}
                                              vesselId={vessel?.vessel_id}
                                              />
                                          </div>
                                      </td>
                                  </tr>
                                  <AnimatePresence initial={false}>
                                    {expandedVessel === vessel?.vessel_id && (
                                      isLoadingByVessel ?
                                        <tr>
                                        <td colSpan={6}>
                                          <div className="w-full flex flex-col justify-center items-center h-48 space-y-2">
                                            <div className="flex space-x-2">
                                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                            </div>
                                            <p className="text-sm text-gray-500">Fetching vessels...</p>
                                          </div>
                                        </td>
                                      </tr>:
                                      <>
                                        {vesselByData?.data?.filter(element => vessel.id !== element.id).map((inspection, inspectionIndex) => (
                                          <motion.tr
                                          key={inspection.id}
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.3, ease: "easeInOut" }}
                                          className={`overflow-hidden group transition-all duration-300 ${
                                            inspectionIndex % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30'
                                          }`}
                                          >
                                            {/* {user?.id === 27 && */}
                                            <td className="px-8 py-3 whitespace-nowrap" />
                                            {/* } */}
                                            <td className="px-8 py-3 whitespace-nowrap" />
                                            <td className="px-8 py-3 whitespace-nowrap text-center">
                                              <div className="text-gray-900">
                                                {inspection?.isManualScore ? (
                                                  <span className="px-3 py-1 text-[12px] bg-amber-100 text-amber-800 rounded-full font-medium">
                                                    Manual Review
                                                  </span>
                                                ) : (
                                                  <span className="text-emerald-700 text-lg">{inspection?.totalScore}</span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-8 py-3 whitespace-nowrap text-center">
                                              {inspection?.isManualScore ? (
                                                <span className="text-amber-600">-</span>
                                              ) : (
                                                <span className="text-blue-700 text-lg">{inspection?.coreScore}</span>
                                              )}
                                            </td>
                                            <td className="px-8 py-3 whitespace-nowrap text-center">
                                              {inspection?.isManualScore ? (
                                                <span className="text-amber-600">-</span>
                                              ) : (
                                                <span className="text-purple-700 text-lg">{inspection?.rotationalScore}</span>
                                              )}
                                            </td>
                                            <td className="px-8 py-3 text-[14px] whitespace-nowrap text-left">
                                              <div className="font-medium text-gray-900">
                                                {inspection?.inspectionDate ? moment(inspection?.inspectionDate).format('DD-MM-YYYY') : '-'}
                                              </div>
                                            </td>
                                            <td className="px-8 py-3 whitespace-nowrap text-center">
                                              <div className="flex items-center justify-end gap-4">

                                                  <InspectionDataDrawer inspectionId={inspection?.id} />
                                                  <button
                                                    onClick={() => handleManualPreview(inspection)}
                                                    className="inline-flex items-center justify-center px-3 py-3
                                                    bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                    transition-all duration-300 hover:scale-105 active:scale-95
                                                    focus:outline-none focus:ring-4 focus:ring-blue-300/30"
                                                    title="Review negative response"
                                                    >
                                                        <PencilIcon className="w-4 h-4 mr-2" />
                                                        Review
                                                    </button>

                                                <button
                                                onClick={() => handlePreview(inspection)}
                                                className="inline-flex items-center justify-center min-w-[130px] px-3 py-3
                                                bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
                                                transition-all duration-300 hover:scale-105 active:scale-95
                                                focus:outline-none focus:ring-4 focus:ring-blue-300/30"
                                                >
                                                  <Ship className="w-4 h-4 mr-2" />
                                                  {inspection?.isManualScore ? 'Manual Review' : 'Vessel Insights'}
                                                </button>
                                                <PremiumDeleteButton 
                                                onDelete={handleDelete}
                                                isLoading={isLoadingDelete} 
                                                inspectionId={inspection?.id}
                                                vesselId={vessel?.vessel_id}
                                                />
                                              </div>
                                            </td>
                                          </motion.tr>
                                        ))}
                                      </>
                                    )}
                                  </AnimatePresence>
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {result?.length === 0 && (
                <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl 
                    flex items-center justify-center mx-auto mb-6">
                    <Ship className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl  text-gray-900 mb-2">No vessels found</h3>
                <p className="text-gray-500 mb-8">Upload your first SIRE 2.0 report to get started</p>
                <button
                onClick={() => navigate(RouteConstant.UPLOAD)}
                className="px-8 py-4 bg-primary text-white font-semibold rounded-2xl 
                shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                    Upload Report
                </button>
                </div>
            )}
        
        </div>
      }

    </div>
  );
};

export default VesselReport;