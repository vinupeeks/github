import React, { useState, useEffect } from "react";
import { Card, Modal } from "antd";
import { useVesselManualExcelDataMutation, useGenerateVesselManualExcelReportMutation } from "../../redux/services/uploadApi";
import ReportFilter from "./ReportFilter";
import { Eye, User, ChevronDown, ChevronUp, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OperationDetailsPopup from "./OperationDetailsPopup";
import { BASEURL } from "../../config/config";

// ReadMore component for truncating long content
const ReadMore = ({ content, maxLength = 50, className = "", type = "text", onViewOperations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content || (Array.isArray(content) && content.length === 0)) return "-";

  // For string content (observations)
  if (typeof content === "string") {
    if (content.length <= maxLength) {
      return <div className={className}>{content}</div>;
    }

    return (
      <div className={className}>
        {isExpanded ? content : `${content.substring(0, maxLength)}...`}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-500 hover:text-blue-700 ml-1 text-xs font-medium flex items-center mt-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} className="mr-1" /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} className="mr-1" /> Show more
            </>
          )}
        </button>
      </div>
    );
  }

  if (Array.isArray(content)) {
    if (content[0] && content[0].pifNumber !== undefined) {
      const firstItem = (
        <div className="mb-1">
          <span className="font-semibold">{content[0].pifNumber}:</span>{" "}
          {content[0].pifDescription}
        </div>
      );

      if (content.length === 1) {
        return <div className={className}>{firstItem}</div>;
      }

      return (
        <div className={className}>
          {firstItem}
          {isExpanded && (
            <div className="mt-1">
              {content.slice(1).map((p, idx) => (
                <div key={idx} className="mb-1">
                  <span className="font-semibold">{p.pifNumber}:</span>{" "}
                  {p.pifDescription}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-500 hover:text-blue-700 mt-1 text-xs font-medium flex items-center"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} className="mr-1" /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} className="mr-1" />
                Show {content.length - 1} more PIF{content.length > 2 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      );
    }

    if (content[0] && (content[0].date !== undefined || content[0].rootCause !== undefined)) {
      const summaryText = `${content.length} operation${content.length !== 1 ? 's' : ''} recorded`;

      return (
        <div className={className}>
          <div className="text-xs text-gray-600 mb-1">{summaryText}</div>

          <div className="p-2 bg-gray-50 border rounded text-xs">
            <div className="truncate">
              <span className="font-semibold">Last:</span> {content[0].date || "No date"} - {content[0].name || "No name"}
            </div>
          </div>

          <button
            onClick={() => onViewOperations(content)}
            className="text-blue-500 hover:text-blue-700 mt-1 text-xs font-medium flex items-center"
          >
            <Eye size={14} className="mr-1" /> View details
          </button>
        </div>
      );
    }
  }

  return <div className={className}>{content.toString()}</div>;
};

function Report() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeFromUrl = searchParams.get("type") || "obs";
  const [activeTab, setActiveTab] = useState(typeFromUrl);
  const backendUrl = BASEURL;

  const [humanData, setHumanData] = useState([]);
  const [obsData, setObsData] = useState([]);
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [selectedOperations, setSelectedOperations] = useState([]);

  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    vessel_id: "",
    category: "",
    human_name: "",
  });

  const clearFilters = () => {
    setFilters({
      fromDate: null,
      toDate: null,
      vessel_id: "",
      category: "",
      human_name: "",
    });
  };

  const typeChange = (type) => {
    clearFilters();
    setActiveTab(type);
    navigate(`?type=${type}`);
  };

  useEffect(() => {
    setActiveTab(typeFromUrl);
  }, [typeFromUrl]);

  const [vesselManualExcelData, { isLoading, data }] =
    useVesselManualExcelDataMutation();

  const [generateExcel, { isLoading: isExporting }] =
    useGenerateVesselManualExcelReportMutation();

  const handleExportExcel = async () => {
    try {
      const res = await generateExcel({ type: activeTab, filter: filters }).unwrap();

      if (res.success && res.fileUrl) {
        window.open(`${backendUrl}${res.fileUrl}`, "_blank");
      } else {
        console.error("Excel export failed:", res.message);
      }
    } catch (err) {
      console.error("Error exporting Excel:", err);
    }
  };

  // Handle view operations button click
  const handleViewOperations = (operations) => {
    setSelectedOperations(operations);
    setOperationModalVisible(true);
  };

  // 🔹 Parse PIF data (could be string or array)
  const parsePifData = (pifData) => {
    if (!pifData) return [];
    
    try { 
      if (Array.isArray(pifData)) {
        return pifData;
      } 
      if (typeof pifData === 'string') {
        try {
          const parsed = JSON.parse(pifData);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (parseError) { 
          if (pifData.trim() !== '') {
            return [{ pifNumber: 'PIF', pifDescription: pifData }];
          }
          return [];
        }
      }
      
      if (typeof pifData === 'object') {
        return [pifData];
      }
      
      return [];
    } catch (error) {
      console.error("Error parsing PIF data:", error);
      return [];
    }
  };

  // 🔹 Transform Human data
  const transformHumanData = (apiData) => {
    const rows = [];
    apiData?.forEach((vessel) => {
      vessel.vessel_inspections.forEach((insp) => {
        insp.inspection_questions.forEach((q) => {
          q.inspection_scores.forEach((score, idx) => {
            if (score.category === "human") {
              const parsedPif = parsePifData(score.pif);
              
              rows.push({
                id: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
                vessel: vessel.vessel_name,
                date: new Date(insp.report_date).toLocaleDateString("en-GB"),
                company: insp.company_name,
                observation: score.remark,
                pif: parsedPif,
                rank: score.crew_position?.crew_position || "-",
                name: score.human_name,
              });
            }
          });
        });
      });
    });
    return rows;
  };

  // 🔹 Transform Obs data
  const transformObsData = (apiData) => {
    const rows = [];
    apiData?.forEach((vessel) => {
      vessel.vessel_inspections.forEach((insp) => {
        insp.inspection_questions.forEach((q) => {
          q.inspection_scores.forEach((score, idx) => {
            let operatorComments = [];
            try {
              operatorComments = typeof score.operator_comments === 'string' 
                ? JSON.parse(score.operator_comments) 
                : score.operator_comments || [];
            } catch (e) { 
            }
            
            const parsedPif = parsePifData(score.pif);
            
            rows.push({
              id: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
              vessel: vessel.vessel_name,
              inspectingCompany: insp.company_name,
              inspector: insp.inspector,
              date: new Date(insp.report_date).toLocaleDateString("en-GB"),
              operation: operatorComments,
              port: insp.port_name,
              country: insp.country,
              quesType: score.category,
              chapter: q.chapter_no,
              questionCode: q.viq,
              soc: score.soc,
              noc: score.noc,
              observation: score.remark,
              isWrong: score.isWrong === "yes" ? "Wrong" : "Right",
              isNegative: score.isNegative === "yes" ? "Negative" : "Positive",
              initialRisk:
                q.tag === "Core"
                  ? "High"
                  : q.tag === "Rotational 1"
                    ? "Increased"
                    : q.tag === "Rotational 2"
                      ? "Moderate"
                      : "-",
              risk: score.risk || "-",
              operationStatus: insp.vesselsOperation || "-",
              status: "-",
              master: insp.master || "-",
              cheif_engineer_name: insp.cheif_engineer_name || "-",
              superintendent: insp.superintendent?.name || "-",
              pif: parsedPif, // Add PIF to obs data as well if needed
            });
          });
        });
      });
    });
    return rows;
  };

  // 🔹 Fetch whenever tab changes
  useEffect(() => {
    vesselManualExcelData({ type: activeTab, filter: filters });
  }, [activeTab, filters]);

  // 🔹 Update tables when API data changes
  useEffect(() => {
    if (data?.success) {
      if (activeTab === "human") {
        setHumanData(transformHumanData(data.data));
      } else {
        setObsData(transformObsData(data.data));
      }
    }
  }, [data, activeTab]);


  // Custom Table Component with synchronized top and bottom scrollbars
  const CustomTable = ({ columns, rows }) => {
    const scrollContainerRef = React.useRef(null);
    const topScrollRef = React.useRef(null);
    const [tableWidth, setTableWidth] = React.useState("100%");
    const [showTopScroll, setShowTopScroll] = React.useState(false);

    // Calculate table width and sync scroll positions
    React.useEffect(() => {
      const checkScrollbar = () => {
        if (scrollContainerRef.current) {
          const hasHorizontalScroll =
            scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
          setShowTopScroll(hasHorizontalScroll);

          const table = scrollContainerRef.current.querySelector("table");
          if (table) {
            setTableWidth(`${table.scrollWidth}px`);
          }
        }
      };

      const syncScroll = () => {
        if (topScrollRef.current && scrollContainerRef.current) {
          topScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
        }
      };

      const syncTopScroll = () => {
        if (topScrollRef.current && scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
      };

      const container = scrollContainerRef.current;
      const topScroll = topScrollRef.current;

      if (container && topScroll) {
        container.addEventListener("scroll", syncScroll);
        topScroll.addEventListener("scroll", syncTopScroll);

        // Initial check and set up resize observer
        checkScrollbar();
        const resizeObserver = new ResizeObserver(checkScrollbar);
        resizeObserver.observe(container);

        return () => {
          container.removeEventListener("scroll", syncScroll);
          topScroll.removeEventListener("scroll", syncTopScroll);
          resizeObserver.disconnect();
        };
      }
    }, [rows]);

    return (
      <div className="relative">
        {/* 🔝 Top Scrollbar - Only visible when scrolling is needed */}
        {showTopScroll && (
          <div
            ref={topScrollRef}
            className="overflow-x-auto h-4 mb-1 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 scrollbar-thumb-rounded hover:scrollbar-thumb-gray-400"
          >
            <div style={{ width: tableWidth, height: 1 }} />
          </div>
        )}

        {/* Main Table Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 scrollbar-thumb-rounded hover:scrollbar-thumb-gray-400"
          style={{ maxHeight: "70vh" }}
        >
          <table className="w-full border-collapse text-sm" style={{ minWidth: "max-content" }}>
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-1 text-left font-semibold text-gray-700 border-b text-xs whitespace-nowrap"
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 even:bg-gray-50/30 transition-colors"
                  >
                    {columns.map((col) => {
                      let cell = row[col.dataIndex];

                      if (col.dataIndex === "observation") {
                        cell = <ReadMore content={cell} className="align-top" />;
                      } else if (col.dataIndex === "pif") {
                        // Handle PIF data (could be string or array)
                        const pifData = Array.isArray(cell) ? cell : parsePifData(cell);
                        cell = <ReadMore content={pifData} className="align-top" />;
                      } else if (col.dataIndex === "operation" && Array.isArray(cell)) {
                        cell = (
                          <ReadMore
                            content={cell}
                            className="align-top"
                            onViewOperations={handleViewOperations}
                          />
                        );
                      } else if (!cell) {
                        cell = "-";
                      }

                      return (
                        <td key={col.key} className="px-2 py-1 border-b align-top text-xs whitespace-nowrap">
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const humanColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OIL COMPANY", dataIndex: "company", key: "company" },
    // { title: "OBSERVATION", dataIndex: "observation", key: "observation" },
    { title: "PIF", dataIndex: "pif", key: "pif" },
    { title: "OP1 RANK", dataIndex: "rank", key: "rank" },
    { title: "NAME", dataIndex: "name", key: "name" },
  ];

  const obsColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "COMPANY", dataIndex: "inspectingCompany", key: "inspectingCompany" },
    { title: "INSPECTOR", dataIndex: "inspector", key: "inspector" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OPERATION", dataIndex: "operationStatus", key: "operationStatus" },
    { title: "PORT", dataIndex: "port", key: "port" },
    { title: "COUNTRY", dataIndex: "country", key: "country" },
    { title: "CATEGORY", dataIndex: "quesType", key: "quesType" },
    // { title: "CHAPTER", dataIndex: "chapter", key: "chapter" },
    // { title: "QUESTION CODE", dataIndex: "questionCode", key: "questionCode" },
    // { title: "SOC", dataIndex: "soc", key: "soc" },
    // { title: "NOC", dataIndex: "noc", key: "noc" },
    // { title: "OBSERVATION", dataIndex: "observation", key: "observation" },
    { title: "RIGHT / WRONG", dataIndex: "isWrong", key: "isWrong" },
    { title: "POSITIVE / NEGATIVE", dataIndex: "isNegative", key: "isNegative" },
    { title: "INITIAL RISK", dataIndex: "initialRisk", key: "initialRisk" },
    { title: "FINAL RISK", dataIndex: "risk", key: "risk" },
    { title: "STATUS", dataIndex: "status", key: "status" },
    // { title: "Operator Comments", dataIndex: "operation", key: "operation" },
    { title: "MASTER", dataIndex: "master", key: "master" },
    { title: "CHIEF ENGINEER", dataIndex: "cheif_engineer_name", key: "cheif_engineer_name" },
    { title: "SUPERINTENDENT", dataIndex: "superintendent", key: "superintendent" },
  ];


  return (
    <div className="p-2 bg-gray-200 rounded-sm">
      {/* Operation Details Modal */}
      <OperationDetailsPopup
        operations={selectedOperations}
        visible={operationModalVisible}
        onClose={() => setOperationModalVisible(false)}
      />

      {/* Main Head */}
      <div className="flex justify-between items-center mb-6 p-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Vessel Observation
        </h1>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting || (activeTab === "human" ? humanData.length === 0 : obsData.length === 0)}
          className={`px-6 h-[40px] font-semibold rounded-2xl shadow-xl transition-all duration-300 flex items-center gap-3
          ${isExporting || (activeTab === "human" ? humanData.length === 0 : obsData.length === 0)
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-primary text-white hover:shadow-2xl hover:scale-105 active:scale-95"}`}
        >
          {isExporting ? "Exporting..." : "Export Excel"}
        </button>
      </div>

      <div className="mb-1">
        <ReportFilter filters={filters} onChange={setFilters} type={activeTab} />
      </div>

      {/* Conditional Tables */}
      <Card className="p-4">
        {activeTab === "human" ? (
          <CustomTable columns={humanColumns} rows={humanData} />
        ) : (
          <CustomTable columns={obsColumns} rows={obsData} />
        )}
      </Card>
    </div>
  );
}

export default Report;