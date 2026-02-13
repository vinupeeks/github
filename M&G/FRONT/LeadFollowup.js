import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import followupQueries from "../../queries/followupQueries";
import leadQueries from "../../queries/leadsQueries";
import { MessageSquare, X, Calendar, Clock, User, AlertCircle, Check, MessageCircle, 
 ChevronDown, ChevronUp, FileText, Send, CornerDownRight, RefreshCw, Tag, ArrowLeft } from "lucide-react";
import RouteConstants from "../../constant/RouteConstant";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlert } from "../../commponents/responseAlert/AlertProvider";
import { motion, AnimatePresence } from "framer-motion";

const LeadFollowup = ({ onSuccess, leadId, travelId }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [followup, setFollowup] = useState([]);
 const [selectedTab, setSelectedTab] = useState("Followup");
 const [proStatus, setProStatus] = useState([]);
 const [leadFN, setLeadFN] = useState("");
 const [leadLN, setLeadLN] = useState("");
 const [mobile, setMobile] = useState("");
 const [generalComment, setGeneralComment] = useState("");
 const [comments, setComments] = useState([]);
 const [loading, setLoading] = useState(false);
 const [expandedComment, setExpandedComment] = useState(null);
 const [leadStId, setLeadStId] = useState(null)
 const [assignedUser, setAssignedUser] = useState("");
 const [assignedUserName, setAssignedUserName] = useState("");
 
const [leadProduct, setLeadProduct] = useState("");
const [leadDest, setLeadDest] = useState("");
const [leadDuration, setLeadDuration] = useState("");
const [leadNotes, setLeadNotes] = useState("");
const [isNoteExpanded, setIsNoteExpanded] = useState(false);

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 reset,
 formState: { errors, isSubmitting },
 } = useForm({
 defaultValues: {
 feed_back_comment: "",
 lead_status: null,
 },
 });
 
 const { showAlert } = useAlert();
 const location = useLocation();
 const isTourCompleted = location.pathname.includes("tourcompleted");
 const hiddenRoutes = [RouteConstants.LEADS, RouteConstants.TOURCOMPLEATEDLIST];
 const shouldHideButton = hiddenRoutes.includes(location.pathname);

 const createFollowup = followupQueries.useFollowupCreatMutation();
 const viewFollowup = followupQueries.useFollowupViewMutation();
 const viewLead = leadQueries.useLeadsViewMutation();
 const prospectstatus = followupQueries.useProspectStatusMutation();
 const commentHistory = followupQueries.useCommentHistoryMutation();

 // Modified handleEditClick function with improved status handling
const handleEditClick = async () => {
  if (!leadId) return;
  setIsOpen(true);
  setLoading(true);
  
  try {
    // Fetch prospect statuses first
    const pStatus = await prospectstatus.mutateAsync();
    setProStatus(pStatus?.data?.items || []);
    
    // Then fetch follow-up data
    const data ={ leadId: leadId, travel_id: travelId };
    const followUpD = await viewFollowup.mutateAsync(data);
    if (followUpD?.data) {
      setFollowup(followUpD?.data?.leadsFollowUps?.rows);
      
      // Only set the status value after proStatus is populated
      // const statusId = followUpD?.data?.leadsFollowUps?.rows?.[0]?.leadStatusId?.id;
      // if (statusId) {
      //   setValue("lead_status", statusId);
                
      // }
    }
    
    const response = await viewLead.mutateAsync(travelId);
    const lead = response?.data 
    setValue("assignedTo", lead?.assignedTo?.name || "--");
    setLeadFN(lead?.leadId?.first_name);
    setLeadLN(lead?.leadId?.last_name); 
    setMobile(lead?.leadId?.mobile);
    setLeadStId(lead?.statusId?.id)
    setAssignedUser(lead?.assignedTo?.id);
    setAssignedUserName(lead?.assignedTo?.name)

    setLeadProduct(lead?.travelId?.name || "N/A");

    const destinationNames = lead?.leadDestinations
      ?.map(dest => dest?.destinationId?.name)
      ?.filter(Boolean)
      ?.join(", ");

    setLeadDest(destinationNames || "N/A");

    // setLeadDest(lead?.leadDestinations?.[0]?.destination?.name || "N/A");
    setLeadDuration(`${lead?.days || 0}D / ${lead?.nights || 0}N`);
    setLeadNotes(lead?.lead_note || "No notes available");

    const commentHist = await commentHistory.mutateAsync(data.travel_id); 
    setComments(commentHist?.data);
    reset({
      feed_back_comment: "",
      followUp_comment: "",
      });
  } catch (error) {
    console.error("Error fetching follow-up data:", error);
    showAlert("Failed to load followup data", "error");
  } finally {
    setLoading(false);
  }
};


 const selectedStatus = watch("lead_status");
 const watchedAssignedTo = watch("assignedTo");

useEffect(() => {
  if (selectedTab === "Followup" && watchedAssignedTo !== undefined) {
    setValue("assignedTo", assignedUserName);
  }
}, [selectedTab, watchedAssignedTo, setValue]);

 useEffect(() => {
 if (selectedStatus) {
 const statusName = proStatus.find(s => s.id == selectedStatus)?.name;
 const defaultComment = `Status changed to ${statusName || selectedStatus}`;
 setValue("feed_back_comment", defaultComment);
 }
 }, [selectedStatus, setValue, proStatus]);
 const onSubmit = async (formData) => {
 try {
 setLoading(true);
 const payload = {
 id: leadId,
 ...(selectedTab === "Followup"
 ? {
 date: formData.date,
 time: formData.time,
 lead_status: leadStId,
 feed_back_comment: formData.feed_back_comment,
 type: "FOLLOW_UP",
 assigned_to: assignedUser,
 travel_id: travelId
 }
 : selectedTab === "Status"
 ? {
 date: formData.date,
 time: formData.time,
 lead_status: formData.lead_status,
 feed_back_comment: formData.feed_back_comment,
 type: "STATUS",
 travel_id: travelId
   }
 : {
 followUp_comment: formData.followUp_comment,
 travel_id: travelId,
 type: "GENERAL"
 }),
 };
 console.log(`Payload :`,payload);
 
 await createFollowup.mutateAsync(payload);
 reset({
 date: "",
 time: "",
 lead_status: null,
 feed_back_comment: "",
 followUp_comment: "",
 });
 
 const followUpD = await viewFollowup.mutateAsync(leadId);
 setFollowup(followUpD?.data?.leadsFollowUps?.rows);
 
 const commentHist = await commentHistory.mutateAsync(leadId); 
 setComments(commentHist?.data);
 
//  showAlert(selectedTab === "Followup" ? "Follow-up added successfully" : "Comment added successfully", "success");
showAlert(
  selectedTab === "Followup" 
    ? "Follow-up added successfully" 
    : selectedTab === "Status"
      ? "Status updated successfully"
      : "Comment added successfully", 
  "success"
);

 onSuccess();
 } catch (error) {
 console.error("Error updating follow-up:", error);
 showAlert("Failed to update follow-up", "error");
 } finally {
 setLoading(false);
 }
 };

 const handleClose = () => {
 setIsOpen(false);
 setSelectedTab("Followup")
 };

 const handleFolowupdone = async (item) => {
 try {
 setLoading(true);
 await createFollowup.mutateAsync({
 id: item?.lead_id,
 followUp_id: item?.id,
 travel_id: travelId,
 });
 
 const followUpD = await viewFollowup.mutateAsync(item?.lead_id);
 setFollowup(followUpD?.data?.leadsFollowUps?.rows);
 
 showAlert("Follow-up marked as done", "success");
 onSuccess();
 } catch (error) {
 console.error("Error updating follow-up:", error);
 showAlert("Failed to mark follow-up as done", "error");
 } finally {
 setLoading(false);
 }
 };

 const getStatusColor = (status) => {
 switch (String(status).toLowerCase()) {
 case 'completed':
 return 'bg-green-500 text-white';
 case 'registered':
 return 'bg-blue-500 text-white';
 case 'confirmed':
 return 'bg-purple-500 text-white';
 case 'hot':
 return 'bg-red-500 text-white';
 case 'warm':
 return 'bg-orange-500 text-white';
 case 'cold':
 return 'bg-gray-500 text-white';
 default:
 return 'bg-gray-200 text-gray-800';
 }
 };

 const getTypeColor = (type) => {
 switch (type) {
 case 'FOLLOW_UP':
 return 'bg-blue-50 border-l-4 border-blue-500'; 
 case 'GENERAL':
 return 'bg-amber-50 border-l-4 border-amber-500';
 case 'STATUS':
return 'bg-green-50 border-l-4 border-green-500';
 default:
 return 'bg-white border-l-4 border-gray-300'; 
 }
 };

 const getTypeIcon = (type) => {
 switch (type) {
 case 'FOLLOW_UP':
 return <Calendar size={16} className="text-blue-500" />;
 case 'GENERAL':
 return <MessageSquare size={16} className="text-amber-500" />;
 case 'STATUS':
 return <Tag size={16} className="text-green-500" />;
 default:
 return <MessageCircle size={16} className="text-gray-500" />;
 }
 };

 const toggleCommentExpand = (index) => {
 if (expandedComment === index) {
 setExpandedComment(null);
 } else {
 setExpandedComment(index);
 }
 };

 // Animation variants
 const overlayVariants = {
 hidden: { opacity: 0 },
 visible: { opacity: 1, transition: { duration: 0.2 } }
 };

 const modalVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: { 
 opacity: 1, 
 y: 0, 
 transition: { 
 type: "spring",
 damping: 25,
 stiffness: 200
 } 
 }
 };

 return (
 <div className="relative inline-block text-left">
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="bg-[#0c1926] text-white px-2 py-1 text-xs rounded-md hover:bg-[#1a3a5f] transition-colors flex items-center gap-1"
 onClick={handleEditClick}
 >
 {/* <MessageSquare size={12} /> */}
 Follow up
 </motion.button>

 <AnimatePresence>
 {isOpen && (
 <motion.div 
 className="fixed inset-0 z-50 bg-white overflow-hidden"
 initial="hidden"
 animate="visible"
 exit="hidden"
 variants={overlayVariants}
 >
 {/* Header */}
 <div className="bg-[#0c1926] text-white px-6 py-4 flex justify-between items-center shadow-md">
 <div className="flex items-center gap-3">
 <motion.button
 whileHover={{ x: -3 }}
 whileTap={{ scale: 0.95 }}
 onClick={handleClose}
 className="p-1 rounded-full hover:bg-white/20 transition-colors flex items-center gap-2"
 >
 <ArrowLeft size={18} />
 <span>Back</span>
 </motion.button>
 </div>
 
 <h2 className="text-lg font-semibold flex items-center gap-2">
 <MessageCircle size={20} />
 Lead Follow-up & Status Management
 </h2>
 
 <div className="flex items-center gap-2">
 {/* <div className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-2">
 <User size={14} />
 <span>{leadFN} {leadLN}</span>&nbsp;-&nbsp;
 <span>{mobile || 'n/a'}</span>
 </div> */}
 
 {loading && (
 <div className="flex items-center gap-2 text-white/70">
 <RefreshCw size={14} className="animate-spin" />
 <span className="text-sm">Loading...</span>
 </div>
 )}
 </div>
 </div>

 {/* Main Content Area */}
 <motion.div 
 className="h-[calc(100vh-60px)] overflow-y-auto px-6 py-2 bg-gray-50"
 variants={modalVariants}
 >

             {/* Top Quick-Info Bar */}
             <div className="mb-6 space-y-3">
               <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-wrap md:flex-nowrap items-center text-xs gap-0">

                 {/* Name & Number */}
                 <div className="flex-1 min-w-[150px] pr-4 border-r border-gray-200">
                   <p className="text-gray-400 uppercase tracking-wider font-semibold mb-1">Name & Number</p>
                   <p className="font-bold text-gray-900 truncate">{leadFN} {leadLN} - {mobile}</p>
                 </div>

                 {/* Product */}
                 <div className="flex-1 min-w-[100px] px-4 border-r border-gray-200">
                   <p className="text-gray-400 uppercase tracking-wider font-semibold mb-1">Product</p>
                   <p className="font-bold text-gray-900 truncate">{leadProduct || "n/a"}</p>
                 </div>

                 {/* Destination Section */}
                 <div className="group relative flex-1 min-w-[150px] px-4 border-r border-gray-200">
                   <p className="text-gray-400 uppercase tracking-wider font-semibold mb-1">
                     Destinations
                   </p>

                   <div className="flex items-center gap-1">
                     <p className="font-bold text-green-700 truncate max-w-[120px]">
                       {leadDest}
                     </p>

                     {/* Custom Styled Tooltip on Hover */}
                     <div className="invisible group-hover:visible absolute top-full left-4 z-[100] mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl border border-gray-700 transition-all duration-200 opacity-0 group-hover:opacity-100">
                       <div className="font-semibold border-b border-gray-700 pb-1 mb-2 text-gray-300">
                         All Destinations
                       </div>
                       <div className="flex flex-wrap gap-2">
                         {leadDest.split(',').map((name, index) => (
                           <span key={index} className="bg-gray-800 px-2 py-1 rounded border border-gray-600">
                             {name.trim()}
                           </span>
                         ))}
                       </div>
                       {/* Tooltip Arrow */}
                       <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
                     </div>
                   </div>
                 </div>

                 {/* Duration */}
                 <div className="flex-1 min-w-[80px] px-4 border-r border-gray-200">
                   <p className="text-gray-400 uppercase tracking-wider font-semibold mb-1">Duration</p>
                   <p className="font-bold text-gray-900">{leadDuration}</p>
                 </div>

                 {/* Consultant */}
                 <div className="flex-1 min-w-[100px] px-4 border-r border-gray-200">
                   <p className="text-gray-400 uppercase tracking-wider font-semibold mb-1">Consultant</p>
                   <p className="font-bold text-gray-900 truncate">{assignedUserName || '--'}</p>
                 </div>

                 {/* Notes Button - No border-r here */}
                 <div className="pl-4 flex justify-end">
                   <button
                     type="button"
                     onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${isNoteExpanded ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                       }`}
                   >
                     <FileText size={14} />
                     <span className="font-bold">{isNoteExpanded ? "Hide Notes" : "View Notes"}</span>
                     {isNoteExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                   </button>
                 </div>
               </div>

               {/* Expandable Notes Section - Remains the same */}
               <AnimatePresence>
                 {isNoteExpanded && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden"
                   >
                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm shadow-inner">
                       <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold text-amber-800 flex items-center gap-2">
                           <FileText size={16} /> Lead Notes & Requirements
                         </h4>
                       </div>
                       <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                         {leadNotes || "No internal notes provided for this lead."}
                       </p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

 <div className={`mx-auto ${isTourCompleted ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 xl:grid-cols-[350px_1fr] gap-6"}`}>
 
 {/* Form Section */}
 {!isTourCompleted && (
 <div className="bg-white rounded-lg border shadow-md">
 <div className="flex border-b">
 {["Followup", "General", "Status"].map((tab) => (
  <button
    key={tab}
    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
      selectedTab === tab
      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
      : "text-gray-600 hover:bg-gray-50"
    }`}
    onClick={() => setSelectedTab(tab)}
    type="button"
  >
    {tab === "Followup" ? (
      <div className="flex items-center justify-center gap-2">
        <Calendar size={16} />
        <span>Follow-up</span>
      </div>
    ) : tab === "General" ? (
      <div className="flex items-center justify-center gap-2">
        <MessageSquare size={16} />
        <span>General</span>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2">
        <Tag size={16} />
        <span>Status</span>
      </div>
    )}
  </button>
))}

 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">

  {/* Follow-up Tab Fields */}
  {selectedTab === "Followup" && (
    <>
      {/* Assigned Field */}
      <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Assigned To
    </label>
    <div className="relative">
      <input
        {...register("assignedTo")}
        readOnly
        className="w-full p-2 border rounded-md bg-gray-50 text-gray-700"
      />
    </div>
  </div>
      <div className="grid grid-cols-2 gap-4">
      
        {/* Date Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              {...register("date", { required: true })}
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? "border-red-500" : ""
              }`}
            />
          </div>
          {errors.date && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Date is required
            </p>
          )}
        </div>

        {/* Time Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Time
          </label>
          <div className="relative">
            <input
              type="time"
              {...register("time")}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Follow-up Comment Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comment <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            {...register("feed_back_comment", { required: "Comment is required" })}
            placeholder="Enter follow-up details..."
            className={`w-full p-3 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.feed_back_comment ? "border-red-500" : ""
            }`}
          />
        </div>
        {errors.feed_back_comment && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.feed_back_comment.message}
          </p>
        )}
      </div>
    </>
  )}

  {/* Status Tab Fields */}
  {selectedTab === "Status" && (
    <>
      {/* Status Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lead Status <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            {...register("lead_status", { required: "Status is required" })}
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              errors.lead_status ? "border-red-500" : ""
            }`}
          >
            <option value="">Select status</option>
            {proStatus?.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>
        {errors.lead_status && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.lead_status.message}
          </p>
        )}
      </div>
      
      {/* Status Comment Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status Note <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            {...register("feed_back_comment", { required: "Status note is required" })}
            placeholder="Add details about this status change..."
            className={`w-full p-3 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.feed_back_comment ? "border-red-500" : ""
            }`}
          />
        </div>
        {errors.feed_back_comment && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.feed_back_comment.message}
          </p>
        )}
      </div>
    </>
  )}

  {/* General Tab Fields */}
  {selectedTab === "General" && (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        General Comment <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <textarea
          {...register("followUp_comment", { required: "Comment is required" })}
          placeholder="Enter general comment details..."
          className={`w-full p-3 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.followUp_comment ? "border-red-500" : ""
          }`}
        />
      </div>
      {errors.followUp_comment && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={12} />
          {errors.followUp_comment.message}
        </p>
      )}
    </div>
  )}

  {/* Submit Button */}
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    type="submit"
    disabled={isSubmitting || loading}
    className="w-full bg-[#0c1926] text-white py-3 rounded-md hover:bg-[#1a3a5f] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
  >
    {isSubmitting || loading ? (
      <>
        <RefreshCw size={16} className="animate-spin" />
        <span>Processing...</span>
      </>
    ) : (
      <>
        <Send size={16} />
        <span>Add {selectedTab}</span>
      </>
    )}
  </motion.button>
</form>

 </div>
 )}

 {/* Results Panel */}
 <div className="space-y-6">
 {/* Scheduled Follow-ups Section */}
{/* Scheduled Follow-ups Section */}
<div className="bg-white rounded-lg border shadow-md">
  <div className="bg-gradient-to-r from-[#0c1926] to-[#1a3a5f] text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
    <h3 className="font-medium flex items-center gap-2">
      <Calendar size={16} />
      <span>Scheduled Follow-ups</span>
    </h3>
    <span className="bg-white text-[#0c1926] text-xs px-2 py-1 rounded-full font-medium">
      {followup?.length || 0}
    </span>
  </div>

  <div className="max-h-[35vh] overflow-y-auto p-4 space-y-3">
    {loading ? (
      <div className="flex justify-center items-center p-6">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    ) : followup && followup.length > 0 ? (
      followup.map((item, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`rounded-lg border transition-all p-4 ${
            item?.followUp_status === "Done" 
              ? "bg-green-50 border-green-200" 
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {/* Status and dates info */}
            <div>
              <p className="text-gray-500">Followup Status</p>
              <p className="font-semibold flex items-center gap-1.5">
                <Tag size={14} className="text-gray-500" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  getStatusColor(item?.leadStatusId?.name)
                }`}>
                  {item?.leadStatusId?.name || "Unknown Status"}
                </span>
              </p>
              
              <p className="text-gray-500 mt-2">Created Date</p>
              <p className="font-semibold">
              {item?.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : null}
              </p>
              
              <p className="text-gray-500 mt-2">Assigned To</p>
              <p className="font-semibold">{item?.assignedTo?.name || "N/A"}</p>
            </div>
            
            {/* Follow-up Comment */}
            <div className="max-w-full md:col-span-2">
              <p className="text-gray-500">Followup Comment</p>
              <p className="font-semibold whitespace-pre-wrap break-words">
                {item?.feed_back_comment || "No comment provided"}
              </p>
            </div>
            
            {/* Date and Creator info */}
            <div>
              <p className="text-gray-500">Followup Date</p>
              <p className="font-semibold flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-500" />
                <span>
                  {item?.date ? new Date(item?.date).toLocaleDateString("en-IN") : "No date"}
                </span>
              </p>
              
              {item?.time && (
                <>
                  <p className="text-gray-500 mt-2">Followup Time</p>
                  <p className="font-semibold flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-500" />
                    <span>{item?.time}</span>
                  </p>
                </>
              )}
              
              <p className="text-gray-500 mt-2">Created By</p>
              <p className="font-semibold flex items-center gap-1.5">
                <User size={14} className="text-gray-500" />
                <span>{item?.createdBy?.name || "Unknown"}</span>
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          { item?.followUp_status !== "Done" && (
            <div className="mt-4 pt-3 border-t border-blue-200">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFolowupdone(item)}
                disabled={loading || item?.followUp_comment === null}
                title={item?.followUp_comment === null ? "Comment is required" : ""}
                className="bg-[#0c1926] hover:bg-[#1a3a5f] text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70"
              >
                {loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                <span>Mark as Done</span>
              </motion.button>
            </div>
          )}
          {/* {!shouldHideButton && item?.followUp_status !== "Done" && (
            <div className="mt-4 pt-3 border-t border-blue-200">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFolowupdone(item)}
                disabled={loading}
                className="bg-[#0c1926] hover:bg-[#1a3a5f] text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70"
              >
                {loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                <span>Mark as Done</span>
              </motion.button>
            </div>
          )} */}
        </motion.div>
      ))
    ) : (
      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
        <Calendar size={36} className="mx-auto mb-2 text-gray-300" />
        <p>No follow-ups scheduled</p>
      </div>
    )}
  </div>
</div>


{/* Comment History Section */}
<div className="bg-white rounded-lg border shadow-md">
  <div className="bg-gradient-to-r from-[#0c1926] to-[#1a3a5f] text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
    <div className="flex items-center gap-6">
      {/* Heading */}
      <h3 className="font-medium flex items-center gap-2">
        <MessageCircle size={16} />
        <span>Comment History</span>
      </h3>
      
      {/* Color Legend - Inline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded-full"></div>
          <span className="text-xs text-white">Follow-up</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-100 border border-amber-500 rounded-full"></div>
          <span className="text-xs text-white">General</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-100 border border-green-500 rounded-full"></div>
          <span className="text-xs text-white">Status</span>
        </div>
      </div>
    </div>
    
    {/* Counter */}
    <span className="bg-white text-[#0c1926] text-xs px-2 py-1 rounded-full font-medium">
      {comments?.length || 0}
    </span>
  </div>

  {/* Table View */}
  <div className="overflow-x-auto">
    {loading ? (
      <div className="flex justify-center items-center p-6">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    ) : comments?.length > 0 ? (
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 border text-left">Commented Date</th>
            <th className="p-2 border text-left">Followup Date</th>
            <th className="p-2 border text-left">Type</th>
            <th className="p-2 border text-left">Created By</th>
            {/* <th className="p-2 border text-left">Status</th> */}
            <th className="p-2 border text-left">Comment</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((comment, index) => {
            const isFollowUp = comment?.type === "FOLLOW_UP";
            const isStatus = comment?.type === "STATUS";
            const isGeneral = comment?.type === "GENERAL";
            
            let rowClass = "hover:bg-gray-100";
            if (isFollowUp) rowClass += " bg-blue-100";
            else if (isStatus) rowClass += " bg-green-100";
            else if (isGeneral) rowClass += " bg-amber-100";
            
            return (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={rowClass}
              >
                <td className="p-2 border">
                  {comment?.createdAt ? new Date(comment?.createdAt).toLocaleDateString("en-IN") : null}
                </td>
                <td className="p-2 border">
                  {comment?.date ? new Date(comment?.date).toLocaleDateString("en-IN") : null}
                </td>
                <td className="p-2 border font-medium">
                  <div className="flex items-center gap-1.5">
                    {isFollowUp ? (
                      <><Calendar size={14} className="text-blue-500" /> Follow-up</>
                    ) : isStatus ? (
                      <><Tag size={14} className="text-green-500" /> Status</>
                    ) : (
                      <><MessageSquare size={14} className="text-amber-500" /> General</>
                    )}
                  </div>
                </td>
                <td className="p-2 border">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-gray-500" />
                    <span>{comment?.createdBy?.name || "Unknown"}</span>
                  </div>
                </td>
                {/* <td className="p-2 border">
                  {comment?.status ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(comment?.status)
                    }`}>
                      {comment?.status}
                    </span>
                  ) : "—"}
                </td> */}
                <td className="p-2 border">
                  <div className={`${
                    expandedComment === index ? "" : "line-clamp-2"
                  }`}>
                    {comment?.feed_back_comment || comment?.followUp_comment || "No comment"}
                  </div>
                  
                  {/* Expand/Collapse Toggle */}
                  {(comment?.feed_back_comment?.length > 100 || comment?.followUp_comment?.length > 100) && (
                    <button 
                      onClick={() => toggleCommentExpand(index)}
                      className="text-blue-600 text-xs mt-1 flex items-center gap-1 hover:underline"
                    >
                      {expandedComment === index ? (
                        <>
                          <ChevronUp size={12} />
                          <span>Show less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={12} />
                          <span>Read more</span>
                        </>
                      )}
                    </button>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    ) : (
      <div className="text-center py-6 text-gray-500 bg-gray-50">
        <MessageSquare size={36} className="mx-auto mb-2 text-gray-300" />
        <p>No comments available</p>
      </div>
    )}
  </div>
</div>


 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

export default LeadFollowup;
