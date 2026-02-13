import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import RouteConstants from "../../constant/RouteConstant";
import { useDispatch, useSelector } from "react-redux";
import { 
 Plane, 
 ArrowRightFromLine, 
 Bookmark, 
 Building, 
 CalendarCheck, 
 CheckCircle, 
 ChevronLeft,
 ChevronRight, 
 FileText, 
 LayoutDashboardIcon, 
 LogOut, 
 MapPin, 
 Package, 
 UserPlus, 
 Users,
 Settings,
 TicketCheck,
 Network,
 Phone,
 PhoneCall,
 UserX,
 TicketX,
 ShieldCheck,
 MapPinCheck
} from "lucide-react";
import { resetData } from "../../redux/reducers/authReducer";
import { setToggleValue } from "../../redux/reducers/sidebarReducer";
import ReportsDropdown from "./ReportsDropdown";

function Sidebar({ className }) {
 const toggle = useSelector(state => state.toggle.isVisible);
  const permissions = useSelector((state) => state.token.Permissions);
  const [userId, setUserId] = useState(localStorage.getItem("userid"));
  const Roledata = useSelector((state) => state.token.Roles?.[0]?.label || "");

  const isMasterRole = ["ADMIN", "MD", "DIRECTOR"].includes(Roledata);
  const hasPermission = (key) => {
    if (Roledata?.toLowerCase() === "admin") {
      // If user is admin, bypass all permissions and return true
      return true;
    }
    if (!permissions || permissions.length === 0) return false;
    return permissions[0]?.[key]?.toLowerCase() === "yes";
  };
 const navigate = useNavigate();
 const [userRole, setUserRole] = useState(null);
 const [showMasterMenu, setShowMasterMenu] = useState(false);
 const [hoveredItem, setHoveredItem] = useState(null);
 const dispatch = useDispatch();
 const location = useLocation();
 
 // Use the Redux state directly to avoid mismatch
 const isCollapsed = toggle;

 useEffect(() => {
 const role = localStorage.getItem("roles");
 setUserRole(role);
 }, []);

 useEffect(() => {
 const masterRoutes = [
 RouteConstants.BRANCH,
 RouteConstants.COUNTRY,
 RouteConstants.COUNTRYSUB,
 RouteConstants.PACKEGES,
 RouteConstants.PACKAGESCHEDULE,
 RouteConstants.DOCUMENTMASTER,
 RouteConstants.REFERENCE,
 RouteConstants.AIRLINE,
 RouteConstants.AIRPORT,
 RouteConstants.ISSUEFROM,
 RouteConstants.MODEOFCONTACTS,
 RouteConstants.INSURANCE
 ];
 
 if (masterRoutes.includes(location.pathname)) {
 setShowMasterMenu(true);
 }
 // Collapse sidebar when navigating away from the dashboard
 if (location.pathname !== RouteConstants.DASHBOARD) {
  dispatch(setToggleValue(true)); // Collapse
} else {
  dispatch(setToggleValue(false)); // Expand on dashboard
}
 }, [location.pathname, dispatch]);

 const handleLogout = () => {
 dispatch(resetData());
 navigate(RouteConstants.LOGIN);
 };

 const toggleSidebar = () => {
 // Update Redux state directly
 dispatch(setToggleValue(!isCollapsed));
 };
 
 // Modified menuItemClass to ensure icon display in collapsed state
 const menuItemClass = ({ isActive }) => {
 return `relative flex items-center no-underline ${
 isCollapsed ? "justify-center px-3" : "justify-start px-2"
 } py-2 my-1 rounded-md transition-all duration-200 ${
 isActive 
 ? "bg-[var(--color-primary-dark)] text-[var(--color-primary-contrast)] font-medium border-l-[3px] border-[var(--color-secondary)]" 
 : "text-gray-300 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-contrast)] border-l-[3px] border-transparent"
 }`;
 };

 const MainMenu = () => (
 <div className="flex flex-col h-full overflow-hidden">
 <ul className="flex flex-col space-y-.5 px-2 navbar-button">
 <li>
 <NavLink 
 to={RouteConstants.DASHBOARD} 
 className={menuItemClass}
 end
 >
 {/* Add center class to keep icon centered in collapsed mode */}
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <LayoutDashboardIcon className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 no-underline text-sm">
 Dashboard
 </span>
 )}
 </NavLink>
 </li>
{hasPermission("holidays") && (
 <li>
 <NavLink 
 to={RouteConstants.LEADS} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <UserPlus className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 My Clients (Holidays)
 </span>
 )}
 </NavLink>
 </li>
 )}
{hasPermission("holidays") && (
 <li>
 <NavLink 
 to={RouteConstants.TOURCOMPLEATEDLIST} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <CheckCircle className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 Completed (Holidays) 
 </span>
 )}
 </NavLink>
 </li>
 )}

 {hasPermission("holidays") && (
 <li>
 <NavLink 
 to={RouteConstants.LEADSNOTINTERESTED} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <UserX className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 Not Interested (Holidays) 
 </span>
 )}
 </NavLink>
 </li>
 )}

 {/* Ticketing */}
 {hasPermission("ticketing") && (
  <li>
    <NavLink
      to={RouteConstants.TICKETING}
      className={menuItemClass}
    >
      <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
        <TicketCheck className="w-5 h-5 min-w-[20px]" />
      </div>
      {!isCollapsed && (
        <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
          Ticketing
        </span>
      )}
    </NavLink>
  </li>
)}

 

{hasPermission("ticketing") && (
 <li>
 <NavLink 
 to={RouteConstants.TICKETSNOTINTERESTED} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <TicketX className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 Not Interested (Ticketing) 
 </span>
 )}
 </NavLink>
 </li>
 )}

 {(userRole === "3" || userId === "81") && ( //access for MD and Anish
 <li>
 
 <NavLink 
 to={RouteConstants.MDCALLLOGS} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <PhoneCall className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 Call-logs
 </span>
 )}
 </NavLink>
 </li>
 )}

 <li>
    <NavLink
      to={RouteConstants.TRAVELINSURANCE}
      className={menuItemClass}
    >
      <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
        <ShieldCheck className="w-5 h-5 min-w-[20px]" />
      </div>
      {!isCollapsed && (
        <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
          Travel Insurance
        </span>
      )}
    </NavLink>
  </li>

 {(userRole === "1" || userRole === "3" || userRole === "4") && (
 <li>
 
 <NavLink 
 to={RouteConstants.EMPLOYEES} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Users className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
 Employees
 </span>
 )}
 </NavLink>
 </li>
 )}

{hasPermission("holidays") && (
  <ReportsDropdown
    isCollapsed={isCollapsed}
    hoveredItem={hoveredItem}
    setHoveredItem={setHoveredItem}
    menuItemClass={menuItemClass}
  />
  
)}



 {/* {(userRole === "1" || userRole === "3" || userRole === "4") && ( */}
 <li 
 onMouseEnter={() => setHoveredItem('master')}
 onMouseLeave={() => setHoveredItem(null)}
 >
 <button
 onClick={(e) => {
 e.preventDefault();
 setShowMasterMenu(true);
 }}
 className={`w-full no-underline ${
 isCollapsed ? "justify-center px-3" : "justify-between px-2"
 } relative flex items-center py-3 my-1 rounded-md transition-all duration-200 text-gray-300 hover:bg-primary-light hover:text-white`}
 >
 <div className={`flex items-center ${isCollapsed ? "mx-auto" : ""}`}>
 <Settings className="w-5 h-5 min-w-[20px]" />
 {!isCollapsed && (
//  <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
//  Master
//  </span>
<>
{isMasterRole ? (
  <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
    Master
  </span>
) : (
  <span className="ml-3 whitespace-nowrap opacity-100 text-sm">
    Packages
  </span>
)}
</>
 )}
 </div>
 {!isCollapsed && (
 <ChevronRight className="w-4 h-4 text-gray-400" />
 )}
 
 {isCollapsed && hoveredItem === 'master' && (
 <div className="absolute left-full ml-2 w-48 rounded-md shadow-lg py-1 bg-[#0c1926] text-white z-50 border border-[#1a3a5f]">
 <div className="py-1 text-left">
 <NavLink to={RouteConstants.BRANCH} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Branch
 </NavLink>
 <NavLink to={RouteConstants.COUNTRY} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Destinations
 </NavLink>
  <NavLink to={RouteConstants.COUNTRYSUB} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Destinations Sub
 </NavLink>
 <NavLink to={RouteConstants.COUNTRIES} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
Country </NavLink>
 <NavLink to={RouteConstants.PACKEGES} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Packages
 </NavLink>
 <NavLink to={RouteConstants.PACKAGESCHEDULE} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Package Schedule
 </NavLink>
 <NavLink to={RouteConstants.DOCUMENTMASTER} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Document Type
 </NavLink>
 <NavLink to={RouteConstants.MODEOFCONTACTS} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Primary Reference
 </NavLink>
 <NavLink to={RouteConstants.REFERENCE} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Secondary Reference
 </NavLink>
 <NavLink to={RouteConstants.AIRLINE} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Airline
 </NavLink>
 <NavLink to={RouteConstants.AIRPORT} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Airport
 </NavLink>
 <NavLink to={RouteConstants.ISSUEFROM} className="block px-2 py-2 text-sm hover:bg-[#0a1722] no-underline">
 Issued From
 </NavLink>
 
 
 </div>
 </div>
 )}
 </button>
 </li>
 {/* )} */}
 </ul>

 <div className="mt-auto mb-4 px-2">
 <div>
 <NavLink 
 to={RouteConstants.LOGIN} 
 onClick={(e) => {
 e.preventDefault();
 handleLogout();
 }}
 className={`relative flex items-center no-underline ${
 isCollapsed ? "justify-center px-3" : "justify-start px-2"
 } py-3 my-1 rounded-md transition-all duration-200 text-gray-300 hover:bg-[#0a1722] hover:text-white`}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <LogOut className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap opacity-100">
 Logout
 </span>
 )}
 </NavLink>
 </div>
 </div>
 </div>
 );

 const MasterMenu = () => (
 <div className="flex flex-col h-full px-2">
 <div className="">
 <button
 onClick={(e) => {
 e.preventDefault();
 setShowMasterMenu(false);
 }}
 className={`w-full flex items-center no-underline ${
 isCollapsed ? "justify-center px-3" : "justify-start px-2"
 } py-1 my-1 rounded-md transition-all duration-200 text-gray-300 hover:bg-primary-light hover:text-white`}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <ChevronLeft className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-3 whitespace-nowrap text-sm opacity-100">
 Back to Main Menu
 </span>
 )}
 </button>
 </div>

 <div className="border-b border-[#1a3a5f] mb-4"></div>

 <h3 className={`text-gray-400 text-xs uppercase font-semibold mb-2 ${isCollapsed ? "text-center px-0" : "px-2"}`}>
 {/* {isCollapsed ? "MAS" : "MASTER"} */}
 {isCollapsed
        ? isMasterRole
          ? "MAS"
          : "PKG"
        : isMasterRole
        ? "MASTER"
        : "PACKAGES"}
 </h3>
 
 <ul className="flex flex-col space-y-0 px-2">
 {(userRole === "1" || userRole === "3" || userRole === "4") && (
  <>
 <li>
 <NavLink 
 to={RouteConstants.BRANCH} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Building className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Branch
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.COUNTRY} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <MapPin className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Destinations
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.COUNTRYSUB}
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <MapPin className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Sub Destinations
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.COUNTRIES} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <MapPin className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Country
 </span>
 )}
 </NavLink>
 </li>

 </>
 )}
 <li>
 <NavLink 
 to={RouteConstants.PACKEGES} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Package className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Packages
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.PACKAGESCHEDULE} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <CalendarCheck className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Package Schedule
 </span>
 )}
 </NavLink>
 </li>
 {(userRole === "1" || userRole === "3" || userRole === "4") && (
  <>
 <li>
 <NavLink 
 to={RouteConstants.DOCUMENTMASTER} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <FileText className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Document Type
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.MODEOFCONTACTS} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Network className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Primary Reference
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.REFERENCE} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Bookmark className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Secondary Reference
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.AIRLINE} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Plane className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Airline
 </span>
 )}
 </NavLink>
 </li>

 <li>
 <NavLink 
 to={RouteConstants.AIRPORT} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Plane className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Airport
 </span>
 )}
 </NavLink>
 </li>
 <li>
 <NavLink 
 to={RouteConstants.ISSUEFROM} 
 className={menuItemClass}
 >
 <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
 <Bookmark className="w-5 h-5 min-w-[20px]" />
 </div>
 {!isCollapsed && (
 <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
 Issued From
 </span>
 )}
 </NavLink>
 </li>
 <li>
      <NavLink 
        to={RouteConstants.INSURANCE} 
        className={menuItemClass}
      >
        <div className={`flex-shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
          <Building className="w-5 h-5 min-w-[20px]" />
        </div>
        {!isCollapsed && (
          <span className="ml-1 whitespace-nowrap opacity-100 text-sm">
            Insurance
          </span>
        )}
      </NavLink>
    </li>
 </>
 )}
 </ul>
 </div>
 );

 return (
 <div className="relative">
 {/* Sidebar Component - Using CSS transitions instead of framer-motion */}
 <aside 
 style={{
 width: isCollapsed ? "70px" : "213px", // Increased both widths
 transition: "width 0.3s ease"
 }}
 className="fixed top-0 left-0 z-20 h-screen bg-[var(--color-primary)] shadow-xl aside_container"
 >
 {/* Sidebar Header with Logo */}
 <div className={`h-16 flex items-center justify-between px-2 border-b border-[#1a3a5f] relative`}>
 {!isCollapsed && (
 <div className="flex items-center transition-opacity duration-200 opacity-100">
 <span className="text-white font-semibold text-lg">M&G Holidays</span>
 </div>
 )}
 
 {/* Toggle Button */}
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={toggleSidebar}
 className={`p-2 rounded-md bg-primary text-white hover:bg-primary-light transition-colors ${isCollapsed ? "mx-auto" : "ml-auto"}`}
 >
 {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
 </motion.button>
 </div>
 
 {/* Sidebar Content */}
 <div className="h-[calc(100vh-64px)] overflow-y-auto 
  scrollbar-thin 
  scrollbar-track-[#0c1926] 
  scrollbar-thumb-[#2d4a6e] 
  hover:scrollbar-thumb-[#3a5a80]
  transition-all duration-300"
> {showMasterMenu ? <MasterMenu /> : <MainMenu />}
 </div>
 </aside>
 
 {/* Overlay for mobile */}
 {/* {!isCollapsed && (
 <div 
 className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
 onClick={toggleSidebar}
 ></div>
 )} */}
 </div>
 );
}

export default Sidebar;
