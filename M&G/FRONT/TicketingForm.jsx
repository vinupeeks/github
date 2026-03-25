import React, { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import ticketingQueries from "../../queries/ticketingQueries";
import { useAlert } from "../../commponents/responseAlert/AlertProvider";
import airportQueries from "../../queries/airportQueries";
import PhoneInput from 'react-phone-input-2'
import "react-phone-input-2/lib/style.css";
import ticketingmemberQueries from "../../queries/ticketingmemberQueries";
import { useNavigate, useLocation } from "react-router-dom";
import RouteConstants from "../../constant/RouteConstant";
import Layout from "../../commponents/layout/Layout";
import issuefromQueries from "../../queries/issuefromQueries";
import airlineQueries from "../../queries/airlineQueries";
import travelviaQueries from "../../queries/travelviaQueries";
import { Trash2, Edit, } from "lucide-react";
import { BASE_URL } from '../../api/api';
import EmployeeSelector from "./EmployeeSelector";
import employeeQueries from "../../queries/employeeQueries";
import modeofcontactQueries from "../../queries/modeofcontactQueries";
import referenceQueries from "../../queries/referenceQueries";


const TicketingForm = () => {
  const [airports, setAirports] = useState([]);
  const [filteredFromAirports, setFilteredFromAirports] = useState([]);
  const [filteredToAirports, setFilteredToAirports] = useState([]);
  const [filteredIntermediateAirports, setFilteredIntermediateAirports] = useState([]);
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchIntermediate, setSearchIntermediate] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showIntermediateDropdown, setShowIntermediateDropdown] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [memberlength, setMemberlength] = useState(false);
  const [fromCountry, setFromCountry] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [issuefrom, setIssuefrom] = useState([]);
  const [hasConnections, setHasConnections] = useState(false);
  const [airlinelistdata, setAirlinelist] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [departureDateTimes, setDepartureDateTimes] = useState([]);
  const [arrivalDateTimes, setArrivalDateTimes] = useState([]);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [previewFileURL, setPreviewFileURL] = useState("");
  
// Add this to your useState declarations at the top
  const [visaModalOpen, setVisaModalOpen] = useState(false);
  const [visaPreviewFileURL, setVisaPreviewFileURL] = useState("");

  const [modeofcontact, setModeofcontact] = useState([]);
  const [reference, setReference] = useState([]);

  const location = useLocation();
  const initialData = location.state?.ticket;
  const navigate = useNavigate();
  
  // Refs for handling outside clicks
  const fromDropdownRef = useRef(null);
  const toDropdownRef = useRef(null);
  const intermediateDropdownRef = useRef(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      where_from: "",
      where_to: "",
      intermediate_airports: [],
      travel_date: "",
      return_date: "",
      flight_class: "",
      ticket:"",
      visa:"",
      pax: "1",  
      adults: "1", 
      children: "0",
      infants: "0",
      assigned_to: "",
      name: "",
      email: "",
      phone: "",
      second_phone: "",
      address: "",
      notes: "",
      trip_type: initialData?.trip_type || "One way", // ← Set default only on create
      amount: "",
      members: [], 
      newMember: { first_name: "", last_name: "", email: "", mobile: "" },
      has_connections: false
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });
  const selectedPrimaryReference = watch("primary_reference_id");

  const { 
    fields: intermediateFields, 
    append: appendIntermediate, 
    remove: removeIntermediate 
  } = useFieldArray({
    control,
    name: "intermediate_airports",
  });

  // Add this function to add a new connection row
 




  const createticketing = ticketingQueries.useTicketingCreateMutation();
  const updateticketing = ticketingQueries.useTicketingUpdateMutation();
  const viewticketing = ticketingQueries.useTicketingViewMutation();
  const fetchAirports = airportQueries.useListairportMutation();
  const addmembertog = ticketingmemberQueries.useTicketingmemberaddMutation();
  const issuefromlist = issuefromQueries.useListissuefromMutation();
  const airlinelist = airlineQueries.useListairlineMutation();
  const viewticket = ticketingQueries.useTicketViewMutation();
  const viewVisa = ticketingQueries.useVisaViewMutation();
  const getallEmployees = employeeQueries.useEmployeeListAllMutation();

  const fetchModeofcontact = modeofcontactQueries.useModeofcontactListAllMutation();
  const referenceList = referenceQueries.useReferenceListMutation();
  

  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const modeofcontact = await fetchModeofcontact.mutateAsync();
        setModeofcontact(modeofcontact?.data || []);

        const referenceResponse = await referenceList.mutateAsync();
        setReference(referenceResponse?.data?.items || []);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch issue_from options
  useEffect(() => {
    const getIssueFromOptions = async () => {
      try {
        const response = await issuefromlist.mutateAsync();
        const issueFromData = response?.data || [];
        setIssuefrom(issueFromData);
      } catch (error) {
        console.error("Error fetching issue_from data:", error);
        setIssuefrom([]);
        showAlert("Failed to load issue from options", "error");
      } 
    };

    const role = localStorage.getItem("roles");
    setUserRole(role);

        const getEmployeeDatas = async () => {
          try {
            const response = await getallEmployees.mutateAsync();
            console.log(response.data)
            setAllEmployees(response?.data || []);
          } catch (error) {
            console.error("Error fetching employees data:", error);
            setAllEmployees([]);
            showAlert("Failed to load employees from options", "error");
          } 
        };

    getIssueFromOptions();
    getEmployeeDatas();
   
  }, []);
  useEffect(() => {
    const getAirlines = async () => {
      try {
        const response = await airlinelist.mutateAsync();
        const airlinesData = response?.data || [];
        setAirlines(airlinesData);
      } catch (error) {
        console.error("Error fetching airlines:", error);
        setAirlines([]);
        showAlert("Failed to load airlines", "error");
      }
    };
  
    getAirlines();
  }, []);

  const handleAddMember = () => {
    const newMember = {
      first_name: watch("newMember.first_name"),
      last_name: watch("newMember.last_name"),
      email: watch("newMember.email"),
      mobile: watch("newMember.mobile"),
    };

 
  
  
    
    append(newMember);
    
    // Clear the form fields
    setValue("newMember.first_name", "");
    setValue("newMember.last_name", "");
    setValue("newMember.email", "");
    setValue("newMember.mobile", "");
  };
  

  // Handle outside clicks for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      // Close "From" dropdown if click is outside
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target)) {
        setShowFromDropdown(false);
      }
      
      // Close "To" dropdown if click is outside
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target)) {
        setShowToDropdown(false);
      }

      // Close "Intermediate" dropdown if click is outside
      if (intermediateDropdownRef.current && !intermediateDropdownRef.current.contains(event.target)) {
        setShowIntermediateDropdown(false);
      }
    }
    
    // Add event listener when component mounts
    document.addEventListener("mousedown", handleClickOutside);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get selected airport details for display
  const getAirportDetailsById = (id) => {
    const airport = airports.find(a => a.id === id);
    return airport ? `${airport.name} (${airport.code})` : "";
  };

  // Watch form fields for current values
  const whereFrom = watch("where_from");
  const whereTo = watch("where_to");
  const hasConnectionsValue = watch("has_connections");
  
  const getAirportCountryById = (id) => {
    const airport = airports.find(a => a.id === id);
    return airport ? airport.country : "";
  };

  useEffect(() => {
    const getAirports = async () => {
      try {
        const response = await fetchAirports.mutateAsync();
        console.log("Fetched airports response:", response); 
        const airportsData = response?.data || [];
        setAirports(airportsData);
        setFilteredFromAirports(airportsData);
        setFilteredToAirports(airportsData);
        setFilteredIntermediateAirports(airportsData);
      } catch (error) {
        console.error("Error fetching airports:", error);
        setAirports([]); 
        setFilteredFromAirports([]);
        setFilteredToAirports([]);
        setFilteredIntermediateAirports([]);
      }
    };
  
    if (airports.length === 0) {
      getAirports(); // Fetch only if not already available
    }
  }, []);

  // Set search input values when airports are loaded or form values change
  useEffect(() => {
    if (airports.length > 0) {
      const fromCountry = getAirportCountryById(whereFrom);
      const toCountry = getAirportCountryById(whereTo);
      setFromCountry(fromCountry);
      setToCountry(toCountry);
      
      if (whereFrom) {
        setSearchFrom(getAirportDetailsById(whereFrom));
      }
      
      if (whereTo) {
        setSearchTo(getAirportDetailsById(whereTo));
      }
    }
  }, [whereFrom, whereTo, airports]);

  // Watch for changes to has_connections toggle
  useEffect(() => {
    setHasConnections(hasConnectionsValue);
    
    // Clear intermediate airports if connections are disabled
    if (!hasConnectionsValue && intermediateFields.length > 0) {
      removeIntermediate();
    }
  }, [hasConnectionsValue]);

  // Filter airports based on search input
  useEffect(() => {
    if (searchFrom.trim() === "") {
      setFilteredFromAirports(airports);
    } else {
      const filtered = airports.filter(airport => 
        airport.name.toLowerCase().includes(searchFrom.toLowerCase()) || 
        airport.code.toLowerCase().includes(searchFrom.toLowerCase())
      );
      setFilteredFromAirports(filtered);
    }
  }, [searchFrom, airports]);

  useEffect(() => {
    if (searchTo.trim() === "") {
      setFilteredToAirports(airports);
    } else {
      const filtered = airports.filter(airport => 
        airport.name.toLowerCase().includes(searchTo.toLowerCase()) || 
        airport.code.toLowerCase().includes(searchTo.toLowerCase()) 
      );
      setFilteredToAirports(filtered);
    }
  }, [searchTo, airports]);

  useEffect(() => {
    if (searchIntermediate.trim() === "") {
      setFilteredIntermediateAirports(airports);
    } else {
      const filtered = airports.filter(airport => 
        airport.name.toLowerCase().includes(searchIntermediate.toLowerCase()) || 
        airport.code.toLowerCase().includes(searchIntermediate.toLowerCase()) 
      );
      setFilteredIntermediateAirports(filtered);
    }
  }, [searchIntermediate, airports]);

  useEffect(() => {
    if (initialData) {
      setIsEditable(true);
  
      // Fetch ticketing details with the id
      viewticketing.mutateAsync({ id: initialData.id }).then((response) => {
        console.log("View ticketing response:", response);
        
        // Check if response has intermediate_airports
        
        if (response.data.ticketItineraries && response.data.ticketItineraries.length > 0) {
          setValue("has_connections", true);
          setHasConnections(true);
        }
        
        reset(response.data);
        
        // Get the number of members and update state
        const memberslength = response?.data?.ticketingmembers?.length || 0;
        setMemberlength(memberslength);
        
        // Set the search input values for where_from and where_to
        if (response.data.where_from) {
          const fromAirport = airports.find(a => a.id === response.data.where_from);
          if (fromAirport) {
            setSearchFrom(`${fromAirport.name} (${fromAirport.code})`);
          }
        }
  
        if (response.data.where_to) {
          const toAirport = airports.find(a => a.id === response.data.where_to);
          if (toAirport) {
            setSearchTo(`${toAirport.name} (${toAirport.code})`);
          }
        }
        
        // Handle intermediate airports if any
        if (response.data.intermediate_airports && response.data.intermediate_airports.length > 0) {
          // Clear any existing fields
          while (intermediateFields.length > 0) {
            removeIntermediate(0);
          }
          
          // Add each intermediate airport
          response.data.intermediate_airports.forEach(airportId => {
            const airport = airports.find(a => a.id === airportId);
            if (airport) {
              appendIntermediate({ 
                id: airport.id, 
                name: `${airport.name} (${airport.code})` 
              });
            }
          });
        }

             // Handle existing flight connections if any
     
      }).catch((error) => {
        console.error("Error fetching ticketing details:", error);
      });
    }
  }, [initialData, airports]);
  const formatDateTimeForInput = (dateTimeString) => {
    // If the date is already in the correct format, return it
    if (dateTimeString.includes('T')) {
      return dateTimeString;
    }
    
    // Convert the date string to a valid datetime-local input value
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };
  const onSubmit = async (data) => {
    try {
      const paxCount = Number(data.adults) + Number(data.children) + Number(data.infants);
      data.pax = paxCount.toString();
      
      // Format intermediate_airports to be just an array of IDs
      
      const formData = new FormData();

      formData.append('ticketing', JSON.stringify(data));
      
      // Handle file upload if file is selected
      if (data.ticket && data.ticket[0]) {
        formData.append('ticket', data.ticket[0]);
      }
      if (data.visa && data.visa[0]) {
        formData.append('visa', data.visa[0]); 
      }
      
      if (initialData) {
        console.log("id",initialData.id)
        formData.append('id', initialData.id);
        console.log(formData);
        const response = await updateticketing.mutateAsync(formData);

   
        
        if (data.members && data.members.length > 0) {
          const membersWithTicketId = data.members.map(member => ({
            ...member,
            ticket_id: initialData.id
          }));
        
          const membersResponse = await addmembertog.mutateAsync({ 
            members: membersWithTicketId,
            ticket_id: initialData.id
          });
          
          if (membersResponse && membersResponse.success) {
            console.log("Members added successfully:", membersResponse);
          } else {
            console.error("Error adding members:", membersResponse);
            showAlert("Members were not added successfully", "warning");
          }
        }

        if (response && response.success) {
          showAlert(response?.message, "success");
          navigate(RouteConstants.TICKETING);
        }
      } else {
        console.log(formData);
        const response = await createticketing.mutateAsync(formData);
        
        if (response && response.success) {
          const ticketId = response.data.id; 
          
          if (data.members && data.members.length > 0) {
            const membersWithTicketId = data.members.map(member => ({
              ...member,
              ticket_id: ticketId
            }));
          
            const membersResponse = await addmembertog.mutateAsync({ 
              members: membersWithTicketId,
              ticket_id: ticketId
            });
            
            if (membersResponse && membersResponse.success) {
              console.log("Members added successfully:", membersResponse);
            } else {
              console.error("Error adding members:", membersResponse);
              showAlert("Members were not added successfully", "warning");
            }
          }

         
          showAlert(response?.message, "success");
          navigate(RouteConstants.TICKETING);
        }
      }

      
      reset();
    } catch (error) {
      showAlert(
        "An error occurred: " + (error?.message || "Unknown error"),
        "error"
      );
    }
  };

  // Handle airline selection
const handleAirlineChange = (index, airlineId) => {
  const updatedAirlines = [...selectedAirlines];
  updatedAirlines[index] = airlineId;
  setSelectedAirlines(updatedAirlines);
};



  // Handle airport selection
  const handleSelectFromAirport = (airportId, airportDetails) => {
    setValue("where_from", airportId, { shouldValidate: true });
    setSearchFrom(airportDetails);
    setShowFromDropdown(false);
  };

  const handleSelectToAirport = (airportId, airportDetails) => {
    setValue("where_to", airportId, { shouldValidate: true });
    setSearchTo(airportDetails);
    setShowToDropdown(false);
  };

 

  const handleClose = () => {
    navigate(RouteConstants.TICKETING);
  };

  // Watch form values
  const tripType = watch("trip_type");
  const paxCount = Number(watch("pax")) || 1;
  const AdultCount = Number(watch("adults")) || 1;
  const ChildCount = Number(watch("children")) || 0;
  const InfantCount = Number(watch("infants")) || 0;
  const totalPassengers = AdultCount + ChildCount + InfantCount;

  useEffect(() => {
    if (paxCount > 0 && AdultCount === 0) {
      setValue("adults", "1");
    }
  }, [paxCount, AdultCount]);

  register("phone", {
    required: "Number is required",
    validate: (value) => (value?.length >= 10 ? true : "Enter a valid Number"),
  });
  

  
  const handleViewTicket = async () => {
    const fileInput = document.getElementById("ticket-file-input");
    const selectedFile = fileInput?.files[0];
  
    if (selectedFile) {
      // 🟢 Preview the newly uploaded file directly
      const fileURL = URL.createObjectURL(selectedFile);
      setPreviewFileURL(fileURL);
      setTicketModalOpen(true);
      return;
    }
  
    if (initialData?.ticket) {
      let fileName = initialData.ticket;
  
      if (fileName.includes("/")) {
        fileName = fileName.split("/").pop();
      }
  
      try {
        const response = await viewticket.mutateAsync(fileName);
  
        const blob = new Blob([response], {
          type: response.type || "application/pdf",
        });
  
        const blobUrl = URL.createObjectURL(blob);
        setPreviewFileURL(blobUrl);
        setTicketModalOpen(true);
      } catch (error) {
        console.error("Failed to load ticket", error);
        alert("Failed to load the ticket preview.");
      }
    } else {
      alert("No ticket uploaded to view.");
    }
  };

  const handleViewVisa = async () => {
    const fileInput = document.getElementById("visa-file-input");
    const selectedFile = fileInput?.files[0];

    if (selectedFile) {
        const fileURL = URL.createObjectURL(selectedFile);
        setVisaPreviewFileURL(fileURL);
        setVisaModalOpen(true);
        return;
    }

    if (initialData?.visa) {
        let fileName = initialData.visa;
        if (fileName.includes("/")) {
            fileName = fileName.split("/").pop();
        }

        try {
            const response = await viewVisa.mutateAsync(fileName);
            const blob = new Blob([response], {
                type: response.type || "application/pdf",
            });
            const blobUrl = URL.createObjectURL(blob);
            setVisaPreviewFileURL(blobUrl);
            setVisaModalOpen(true);
        } catch (error) {
            console.error("Failed to load visa", error);
            alert("Failed to load the visa preview.");
        }
    } else {
        alert("No visa uploaded to view.");
    }
};
  
     
  useEffect(() => {
    return () => {
      if (previewFileURL) {
        URL.revokeObjectURL(previewFileURL);
      }
    };
  }, [previewFileURL]);

  return (
    <Layout>
      <div className="p-5 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
        <div className="p-5">
        
            <span className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-800 mb-6">
              
                {initialData ? "Edit" : "Create Ticket"}
                </h2>  
                
                <button
                  onClick={() => handleClose()}
                  className="p-2 text-xs font-semibold bg-gray-200 hover:bg-gray-100 rounded-full"
                >
                CLOSE
                </button>
            </span>   
            <div className="max-h-[70vh] overflow-y-auto p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register("name", { required: "Name is required" })}
                className="w-full border border-gray-300 rounded p-2 text-xs"
              />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register("email",)}
                className="w-full border border-gray-300 rounded p-2 text-xs"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone<span className="text-red-500">*</span></label>
              <PhoneInput
                country={"in"}
                enableSearch={true}
                value={watch("phone")}
                onChange={(value) => {
                  setValue("phone", value, { shouldValidate: true });
                }}
                inputClass="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                containerClass="w-full"
                inputStyle={{ width: "100%" }}
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>

                  <div className="w-50">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Second Phone</label>
                    <PhoneInput
                      country={"in"}
                      enableSearch={true}
                      // value={watch("second_phone")}
                      value={watch("second_phone")}
                      onChange={(value) => {
                        setValue("second_phone", value, { shouldValidate: true });
                      }}
                      inputClass="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      containerClass="w-full"
                      inputStyle={{ width: "100%" }}
                    />
                    {errors.second_phone && <p className="text-red-500 text-xs">{errors.second_phone.message}</p>}
                  </div>

            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                {...register("address")} 
                placeholder="Add address" 
                className="w-full text-xs h-30 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Ticket Number</label>
              <input
                type="text"
                {...register("pnr_number")} //defualt value of the ticket number stored in the database as pnr_number field, so not changed the field.
                className="w-full border border-gray-300 rounded p-2 text-xs"
              />
              {errors.ticket_number && <p className="text-red-500 text-xs">{errors.ticket_number.message}</p>}
            </div>
             <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">PNR Number</label>
              <input
                type="text"
                {...register("ticket_number")} //added ticket_number field for store the pnr number
                className="w-full border border-gray-300 rounded p-2 text-xs"
              />
              {errors.ticket_number && <p className="text-red-500 text-xs">{errors.ticket_number.message}</p>}
            </div>
            <div className="w-50">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Trip Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="One way"
                  {...register("trip_type", { required: "Trip Type is required" })}
                  className="form-radio text-blue-500"
                />
                <span className="text-xs">One way</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="Round Trip"
                  {...register("trip_type", { required: "Trip Type is required" })}
                  className="form-radio text-blue-500"
                />
                <span className="text-xs">Round Trip</span>
              </label>
            </div>
            {errors.trip_type && (
              <p className="text-red-500 text-xs">{errors.trip_type.message}</p>
            )}
          </div>
          
          
              {tripType === "Round Trip" && (
                <>
                  <div className="w-50 mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                   Return Ticket Number 
                  </label>
                  <input
                    type="text"
                    {...register("returnpnr_number")} //defualt value of the Return Ticket number stored in the database as returnpnr_number field, so not changed the field.
                    className="w-full border border-gray-300 rounded p-2 text-xs"
                  />
                  {errors.returnticket_number && <p className="text-red-500 text-xs">{errors.returnticket_number.message}</p>}
                </div>
                <div className="w-50 mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                   Return PNR Number 
                  </label>
                  <input
                    type="text"
                    {...register("returnticket_number")} //added returnticket_number field for store the Return pnr number.
                    className="w-full border border-gray-300 rounded p-2 text-xs"
                    />
                  {errors.returnpnr_number && <p className="text-red-500 text-xs">{errors.returnpnr_number.message}</p>}
                </div>
                </>
              )}

              {/* Where From with Search and outside click handling */}
              <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Where From <span className="text-red-500">*</span></label>
              <div className="relative" ref={fromDropdownRef}>
                <input
                  type="text"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  onFocus={() => setShowFromDropdown(true)}
                  placeholder="Search airport..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2"
                />
                <input type="hidden" {...register("where_from")} />
                
                {showFromDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto">
                    {filteredFromAirports.length > 0 ? (
                      filteredFromAirports.map((airport) => (
                        <div
                          key={airport.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectFromAirport(airport.id, `${airport.name} (${airport.code})`)}
                        >
                          <div>{airport.name} ({airport.code})</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500">No airports found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.where_from && <p className="text-red-500 text-xs">{errors.where_from.message}</p>}
            </div>

            {/* Where To with Search and outside click handling */}
            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">Where To <span className="text-red-500">*</span></label>
              <div className="relative" ref={toDropdownRef}>
                <input
                  type="text"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  onFocus={() => setShowToDropdown(true)}
                  placeholder="Search airport..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2"
                />
                <input type="hidden" {...register("where_to")} />
                
                {showToDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto">
                    {filteredToAirports.length > 0 ? (
                      filteredToAirports.map((airport) => (
                        <div
                          key={airport.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectToAirport(airport.id, `${airport.name} (${airport.code})`)}
                        >
                          <div>{airport.name} ({airport.code})</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500">No airports found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.where_to && <p className="text-red-500 text-xs">{errors.where_to.message}</p>}
            </div>

              <div className="w-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Flight Class <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("flight_class")}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select flight class</option>
                  <option value="Economy">Economy</option>
                  <option value="Business">Business</option>
                  <option value="First Class">First Class</option>
                  <option value="Premium Economy">Premium Economy</option>
                </select>
                {errors.flight_class && <p className="text-red-500 text-xs">{errors.flight_class.message}</p>}
              </div>

             
              <div className="w-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">Issue date</label>
                <input
                  type="date"
                  {...register("issue_date",)}
                  className="w-full border border-gray-300 rounded p-2 text-xs"
                />
                {errors.issue_date && <p className="text-red-500 text-xs">{errors.issue_date.message}</p>}
              </div>

              <div className="w-50">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                       Issued From
                  </label>
                  <select
                    {...register("issued_from", )}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Issued from</option>
                      {issuefrom.map((issuefromdata) => (
                      <option key={issuefromdata.id} value={issuefromdata.id}>
                        {issuefromdata.name}
                      </option>
                    ))}
                  </select>
                    {errors.issued_from && (
                        <p className="text-red-500 text-xs">{errors.issued_from.message}</p>
                    )}
                  </div>

              <span>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-2">
                  <div style={{ display: "none" }}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pax <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      {...register("pax", { required: "Members count is required", min: 1 })}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.pax && <p className="text-red-500 text-xs">{errors.pax.message}</p>}
                  </div>
                  
                  <div className="w-50">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Adults</label>
                    <input
                      type="number"
                      {...register("adults")}
                      min="1"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 text-center"
                    />
                  </div>
                  <div className="w-50">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Children</label>
                    <input
                      type="number"
                      {...register("children")}
                      min="0"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 text-center"
                    />
                  </div>
                  <div className="w-50">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Infants</label>
                    <input
                      type="number"
                      {...register("infants")}
                      min="0"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 text-center"
                    />
                  </div>
                </div>
                {errors.pax_count && <p className="text-red-500 text-xs">{errors.pax_count.message}</p>}
                {errors.split && <p className="text-red-500 text-xs">{errors.split.message}</p>}
                </span>


                {/* Primary Reference - Simpler approach */}
                <div className="w-48">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Primary Reference
                  </label>
                  <select
                    {...register("primary_reference_id", {
                      setValueAs: v => v ? Number(v) : null
                    })}
                    disabled={!!initialData}
                    className={`w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${initialData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  >
                    <option value="">Select Reference</option>
                    {modeofcontact.map((moc) => (
                      <option key={moc.id} value={moc.id}>
                        {moc.name}
                      </option>
                    ))}
                  </select>
                  {errors.primary_reference_id && (
                    <p className="text-red-500 text-xs">{errors.primary_reference_id.message}</p>
                  )}
                </div>

                {/* Secondary Reference - Simpler approach */}
                {selectedPrimaryReference && (
                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Secondary Reference
                    </label>
                    <select
                      {...register("secondary_reference_id", {
                        setValueAs: v => v ? Number(v) : null
                      })}
                      value={watch("secondary_reference_id") || ""}
                      disabled={!!initialData}
                      className={`w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${initialData ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                    >
                      <option value="">Select Reference</option>
                      {reference
                        .filter(ref =>
                          selectedPrimaryReference !== null &&
                          Number(ref?.moc_id) === Number(selectedPrimaryReference)
                        )
                        .map((ref) => (
                          <option key={ref.id} value={ref?.id}>
                            {ref?.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              
            </div>

            <hr className="my-6 border-t border-gray-300" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            <div className="col-span-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Onward Journey */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Onward Journey <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("travel_date")}
                  className="w-full border border-gray-300 rounded p-2 text-xs"
                  // min={new Date().toISOString().split("T")[0]}
                  // min={viewticketing?.data?.data?.travel_date ? viewticketing?.data?.data?.travel_date : new Date().toISOString().split("T")[0]}
                />
                {errors.travel_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.travel_date.message}</p>
                )}
              </div>
          
              {/* Return Journey */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Return Journey {tripType === "Round Trip" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={tripType === "Round Trip" ? "date" : "text"}
                  {...register("return_date", {
                    required: tripType === "Round Trip" ? "Return Date is required for Round Trip" : false,
                  })}
                  className={`w-full border border-gray-300 rounded p-2 text-xs ${
                    tripType !== "Round Trip" ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                  }`}
                  min={watch("travel_date") || new Date().toISOString().split("T")[0]}
                  disabled={tripType !== "Round Trip"}
                  placeholder={tripType !== "Round Trip" ? "Return" : ""}
                  onFocus={(e) => {
                    if (tripType !== "Round Trip") {
                      e.target.blur();
                    }
                  }}
                />
                {errors.return_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.return_date.message}</p>
                )}
              </div>
            </div>
          </div>
          

             

              <div className="w-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount<span className="text-red-500">*</span></label>
                <input
                  type="number"
                  {...register("amount")}
                  className="w-full border border-gray-300 rounded p-2 text-xs"
                />
                {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
              </div>

              <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Upload Ticket
              </label>
              
              <div class="flex justify-between gap-2">
              <div className="relative">
                <input
                  type="file"
                  id="ticket-file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  {...register("ticket")}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  onChange={(e) => {
                    // Let React Hook Form handle the file
                    register("ticket").onChange(e);
                    
                    // Update the visible file name
                    const fileName = e.target.files[0]?.name || (initialData?.ticket || "No file chosen");
                    document.getElementById('file-name-display').textContent = fileName;
                  }}
                />
                
                <div className="flex border border-gray-300 rounded overflow-hidden">
                  <label 
                    htmlFor="ticket-file-input" 
                    className="bg-gray-200 px-3 py-2 cursor-pointer text-xs"
                  >
                    Choose File
                  </label>
                  <span 
                    id="file-name-display" 
                    className="px-3 py-2 text-xs"
                  >
                    {initialData?.ticket || "No file chosen"}
                  </span>
                </div>
              </div>
              {(initialData?.ticket || document.getElementById("ticket-file-input")?.files[0]) && (
                <div>
                <button
                  type="button"
                  onClick={handleViewTicket} 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-xs font-medium"
                >
                  View Ticket
                </button>
                </div>
              )}</div>
              
              {errors.ticket && (
                <p className="text-red-500 text-xs">{errors.ticket.message}</p>
              )}
            </div>
            
            <div className="w-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Upload Visa
              </label>
              
              <div class="flex justify-between gap-2">
              <div className="relative">
                <input
                  type="file"
                  id="visa-file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  {...register("visa")}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  onChange={(e) => {
                    // Let React Hook Form handle the file
                    register("visa").onChange(e);
                    
                    // Update the visible file name
                    const fileName = e.target.files[0]?.name || (initialData?.visa || "No file chosen");
                    document.getElementById('visa-file-name-display').textContent = fileName;
                  }}
                />
                
                <div className="flex border border-gray-300 rounded overflow-hidden">
                  <label 
                    htmlFor="visa-file-input" 
                    className="bg-gray-200 px-3 py-2 cursor-pointer text-xs"
                  >
                    Choose File
                  </label>
                  <span 
                    id="visa-file-name-display" 
                    className="px-3 py-2 text-xs"
                  >
                    {initialData?.visa || "No file chosen"}
                  </span>
                </div>
              </div>
              {(initialData?.visa || document.getElementById("visa-file-input")?.files[0]) && (
                <button
                  type="button"
                  onClick={handleViewVisa} 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  View Visa
                </button>
              )}</div>
              
              {errors.ticket && (
                <p className="text-red-500 text-xs">{errors.visa.message}</p>
              )}
            </div>
            <div>
            
            
      
            {/* Modal */}
            {ticketModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] w-[90vw] overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Ticket Preview</h3>
                    <button
                      onClick={() => setTicketModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <span className="text-2xl">&times;</span>
                    </button>
                  </div>
      
                  <div className="overflow-auto max-h-[calc(90vh-120px)]">
                    <iframe
                      src={previewFileURL}
                      className="w-full h-[70vh] border-0"
                      title="Ticket Preview"
                    />
                  </div>
                </div>
              </div>
            )}
             {visaModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] w-[90vw] overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Visa Preview</h3>
                    <button
                      onClick={() => setVisaModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <span className="text-2xl">&times;</span>
                    </button>
                  </div>
      
                  <div className="overflow-auto max-h-[calc(90vh-120px)]">
                    <iframe
                      src={visaPreviewFileURL}
                      className="w-full h-[70vh] border-0"
                      title="Ticket Preview"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>    
              </div>
            
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  {...register("notes")}
                  placeholder="Add a note"
                  className="w-full text-xs h-38 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            

            {(isEditable ? memberlength < totalPassengers - 1 : totalPassengers > 1) && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold text-gray-800 mb-4 text-center">
                  Add Group Members
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Group Member First Name
                    </label>
                    <input
                      type="text"
                      {...register("newMember.first_name")}
                      placeholder="First Name"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
        
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Group Member Last Name
                    </label>
                    <input
                      type="text"
                      {...register("newMember.last_name")}
                      placeholder="Last Name"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
        
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Group Member Email
                    </label>
                    <input
                      type="email"
                      {...register("newMember.email")}
                      placeholder="Email"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
        
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Group Member Phone
                    </label>
                    <PhoneInput
                      country={"in"}
                      enableSearch={true}
                      value={watch("newMember.mobile")}
                      onChange={(value) => {
                        setValue("newMember.mobile", value, { shouldValidate: false });
                      }}
                      inputClass="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      inputStyle={{ width: "100%" }}
                    />
                  </div>

                  <div style={{display:'none'}}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Group Member ID Type
                    </label>
                    <input
                      type="text"
                      {...register("newMember.idtype")}
                      placeholder="ID Type"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div style={{display:'none'}}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ID Number
                    </label>
                    <input
                      type="text"
                      {...register("newMember.idnumber")}
                      placeholder="ID Number"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={fields.length >= totalPassengers - 1}
                    className={`self-end py-2 text-xs px-4 text-white rounded-lg ${
                      fields.length >= totalPassengers - 1
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    title={fields.length >= totalPassengers - 1 ? "Maximum number of members reached" : ""}
                  >
                    {fields.length >= totalPassengers - 1 ? "Group Full" : "Add Group Member"}
                  </button>
                </div>

                 {/* List of added members */}
                 {fields?.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm font-semibold">Added Group Members:</h3>
                          <ul>
                            {fields.map((field, index) => (
                              <li
                                key={field.id}
                                className="flex text-xs items-center justify-between text-gray-700"
                              >
                                <span>
                                  {index + 1} - {field.first_name} {field.last_name} - {field.email}
                                </span>
                                {!initialData &&(
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                )}
                                
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
                   {/* Employee Selector Component */}
                                    {!initialData &&(
                                      <EmployeeSelector
                                        employees={allEmployees}
                                        selectedEmployeeId={watch("assigned_to")}
                                        onEmployeeSelect={(employeeId) => {
                                          // Update the form value
                                          setValue("assigned_to", employeeId);
                                        }}
                                        userRole={userRole}
                                        position="bottom-right"
                                      />
                                    )}
                  <button type="button" onClick={handleClose}  className="py-2 text-xs px-6 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold">
                    Close
                  </button>
                  <button type="submit" disabled={isSubmitting} className="py-2 text-xs px-6 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                </div>
              </form>
              </div>
              </div>
            </div>
          </Layout>
  );
};

export default TicketingForm;