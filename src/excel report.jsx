import React, { useState, useEffect } from "react";
import { Card, Modal } from "antd";
import { useVesselManualExcelDataMutation, useGenerateVesselManualExcelReportMutation } from "../../redux/services/uploadApi";
import ReportFilter from "./ReportFilter";
import { Eye, User, ChevronDown, ChevronUp, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OperationDetailsPopup from "./OperationDetailsPopup";

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

    if (content[0] && content[0].date !== undefined) {
      const summaryText = `${content.length} operation${content.length !== 1 ? 's' : ''} recorded`;

      return (
        <div className={className}>
          <div className="text-xs text-gray-600 mb-1">{summaryText}</div>

          <div className="p-2 bg-gray-50 border rounded text-xs">
            <div className="truncate">
              <span className="font-semibold">Last:</span> {content[0].date} - {content[0].name}
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

  // Handle view operations button click
  const handleViewOperations = (operations) => {
    setSelectedOperations(operations);
    setOperationModalVisible(true);
  };

  // 🔹 Transform Human data
  const transformHumanData = (apiData) => {
    const rows = [];
    apiData?.forEach((vessel) => {
      vessel.vessel_inspections.forEach((insp) => {
        insp.inspection_questions.forEach((q) => {
          q.inspection_scores.forEach((score, idx) => {
            if (score.category === "human") {
              rows.push({
                id: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
                vessel: vessel.vessel_name,
                date: insp.report_date,
                company: insp.company_name,
                observation: score.remark,
                pif: (() => {
                  try {
                    return JSON.parse(score.pif); // if it's valid JSON
                  } catch {
                    return []; // fallback
                  }
                })(),
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
            rows.push({
              id: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
              vessel: vessel.vessel_name,
              inspectingCompany: insp.company_name,
              inspector: insp.inspector,
              date: insp.report_date,
              operation: (() => {
                try {
                  return JSON.parse(score.operator_comments);
                } catch {
                  return [];
                }
              })(),
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
              status: insp.vesselsOperation || "-",
              master: insp.master || "-",
              cheif_engineer_name: insp.cheif_engineer_name || "-",
              superintendent: insp.superintendent?.name || "-",
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

  // Custom Table Component
  const CustomTable = ({ columns, rows }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2 text-left font-semibold text-gray-700 border-b"
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

                  // Use ReadMore component for specific columns
                  if (col.dataIndex === "observation") {
                    cell = <ReadMore content={cell} className="align-top" />;
                  } else if (col.dataIndex === "pif" && Array.isArray(cell)) {
                    cell = <ReadMore content={cell} className="align-top" />;
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
                    <td key={col.key} className="px-4 py-2 border-b align-top">
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
  );

  const humanColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OIL COMPANY", dataIndex: "company", key: "company" },
    { title: "OBSERVATION", dataIndex: "observation", key: "observation" },
    { title: "PIF", dataIndex: "pif", key: "pif" },
    { title: "OP1 RANK", dataIndex: "rank", key: "rank" },
    { title: "NAME", dataIndex: "name", key: "name" },
  ];

  const obsColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "INSPECTING COMPANY", dataIndex: "inspectingCompany", key: "inspectingCompany" },
    { title: "INSPECTOR", dataIndex: "inspector", key: "inspector" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OPERATION", dataIndex: "operation", key: "operation" },
    { title: "PORT", dataIndex: "port", key: "port" },
    { title: "COUNTRY", dataIndex: "country", key: "country" },
    { title: "HARDWARE-PROCESS-HUMAN-PHOTO", dataIndex: "quesType", key: "quesType" },
    { title: "CHAPTER", dataIndex: "chapter", key: "chapter" },
    { title: "QUESTION CODE", dataIndex: "questionCode", key: "questionCode" },
    { title: "SOC", dataIndex: "soc", key: "soc" },
    { title: "NOC", dataIndex: "noc", key: "noc" },
    { title: "OBSERVATION", dataIndex: "observation", key: "observation" },
    { title: "RIGHT / WRONG", dataIndex: "isWrong", key: "isWrong" },
    { title: "POSITIVE / NEGATIVE", dataIndex: "isNegative", key: "isNegative" },
    { title: "INITIAL RISK", dataIndex: "initialRisk", key: "initialRisk" },
    { title: "FINAL RISK", dataIndex: "risk", key: "risk" },
    { title: "STATUS", dataIndex: "status", key: "status" },
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
          className="px-6 h-[40px] bg-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl
               transition-all duration-300 flex items-center gap-3
               hover:scale-105 active:scale-95"
        >
          Export Excel
        </button>
      </div>

      <div className="mb-2">
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