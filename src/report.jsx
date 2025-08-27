import React, { useState, useEffect } from "react";
import { Button, Card, Input, Table } from "antd";
import { useVesselManualExcelDataMutation } from "../../redux/services/uploadApi";

function Report() {
  const [activeTab, setActiveTab] = useState("human"); // 🔹 default lowercase
  const [humanData, setHumanData] = useState([]);
  const [obsData, setObsData] = useState([]);

  const [vesselManualExcelData, { isLoading, data }] =
    useVesselManualExcelDataMutation();

  // 🔹 Transform Human data
  const transformHumanData = (apiData) => {
    const rows = [];
    apiData?.forEach((vessel) => {
      vessel.vessel_inspections.forEach((insp) => {
        insp.inspection_questions.forEach((q) => {
          q.inspection_scores.forEach((score, idx) => {
            if (score.category === "human") {
              rows.push({
                key: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
                vessel: vessel.vessel_name,
                date: insp.report_date,
                company: insp.company_name,
                observation: score.remark,
                pif: score.soc || null,
                rank: score.crew_position?.crew_position || null,
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
            if (score.category !== "human") {
              rows.push({
                key: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
                vessel: vessel.vessel_name,
                inspectingCompany: insp.company_name,
                inspector: insp.inspector,
                date: insp.report_date,
                operation: insp.operation || null,
                port: insp.port_name,
                country: insp.country,
                quesType: score.category,
                chapter: q.chapter_no,
                questionCode: q.viq,
                soc: score.soc,
                noc: score.noc,
                observation: score.remark,
                isWrong: score.isWrong || null,
                isNegative: score.isNegative || null,
                initialRisk: q.tag === "Core" ? "High" : q.tag === "Rotational 1" ? "Increased" : q.tag === "Rotational 2" ? "Moderate" : null,
                risk: score.risk || null,
                master: insp.master || null,
                cheif_engineer_name: insp.cheif_engineer_name || null,
                superintendent: insp.superintendent.name || null,
              });
            }
          });
        });
      });
    });
    return rows;
  };

  // 🔹 Fetch whenever tab changes
  useEffect(() => {
    vesselManualExcelData({ type: activeTab, filter: { vessel_id: null } });
  }, [activeTab]);

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

  // Columns for Human table
  const humanColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OIL COMPANY", dataIndex: "company", key: "company" },
    { title: "OBSERVATION", dataIndex: "observation", key: "observation" },
    { title: "PIF", dataIndex: "pif", key: "pif" },
    { title: "OP1 RANK", dataIndex: "rank", key: "rank" },
    { title: "NAME", dataIndex: "name", key: "name" },
  ];

  // Columns for OBS table
  const obsColumns = [
    { title: "VESSEL", dataIndex: "vessel", key: "vessel" },
    { title: "INSPECTING COMPANY", dataIndex: "inspectingCompany", key: "inspectingCompany" },
    { title: "INSPECTOR", dataIndex: "inspector", key: "inspector" },
    { title: "DATE", dataIndex: "date", key: "date" },
    { title: "OPERATION", dataIndex: "operation", key: "operation" },
    { title: "PORT", dataIndex: "port", key: "port" },
    { title: "COUNTRY", dataIndex: "country", key: "country" },
    { title: "HARDWARE-PROCESS-PHOTO", dataIndex: "quesType", key: "quesType" },
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
    { title: "OWNERS COMMENTS", dataIndex: "ownCmnts", key: "ownCmnts" },
    { title: "MASTER", dataIndex: "master", key: "master" },
    { title: "CHIEF ENGINEER", dataIndex: "cheif_engineer_name", key: "cheif_engineer_name" },
    { title: "SUPERINTENDENT", dataIndex: "superintendent", key: "superintendent" },
  ];

  return (
    <div className="p-2">
      {/* Main Head */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vessel Reports</h1>

        {/* Right Side Buttons */}
        <div className="flex flex-col space-y-2 items-end">
          <div className="flex space-x-2">
            <button
              className={`px-6 h-[40px] 
              ${activeTab === "human" ? "bg-primary text-white" : "bg-primary/50"} 
              font-semibold rounded-2xl shadow-xl hover:shadow-2xl
              transition-all duration-300 flex items-center gap-3
              hover:scale-105 active:scale-95`}
              type={activeTab === "human" ? "primary" : "default"}
              onClick={() => setActiveTab("human")}
            >
              HUMAN
            </button>
            <button
              className={`px-6 h-[40px] 
              ${activeTab === "obs" ? "bg-primary text-white" : "bg-primary/50"} 
              font-semibold rounded-2xl shadow-xl hover:shadow-2xl
              transition-all duration-300 flex items-center gap-3
              hover:scale-105 active:scale-95`}
              type={activeTab === "obs" ? "button" : "button"}
              onClick={() => setActiveTab("obs")}
            >
              OBS
            </button>
          </div>
          <button type="primary"
            className="px-6 h-[40px] bg-primary
                      text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl
                      transition-all duration-300 flex items-center gap-3
                      hover:scale-105 active:scale-95">
            Download
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="mb-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div>
            <label className="block text-sm font-medium">From Date</label>
            <Input type="date" />
          </div>
          <div>
            <label className="block text-sm font-medium">To Date</label>
            <Input type="date" />
          </div>
          <div>
            <label className="block text-sm font-medium">Vessel Name</label>
            <Input placeholder="Enter vessel" />
          </div>
          <div>
            <label className="block text-sm font-medium">Company</label>
            <Input placeholder="Enter company" />
          </div>
        </div>
      </Card>

      {/* Conditional Tables */}
      <Card className="mt-5">
        {activeTab === "human" ? (
          <Table
            loading={isLoading}
            dataSource={humanData}
            columns={humanColumns}
            pagination={false}
            bordered
          />
        ) : (
          <Table
            loading={isLoading}
            dataSource={obsData}
            columns={obsColumns.map(col => ({ ...col, width: 180 }))} // ✅ give each column width
            pagination={{ pageSize: 10 }}
            bordered
            scroll={{ x: 3000, y: 500 }}  // ✅ wide scroll + vertical scroll
            sticky={{ offsetHeader: 0 }}
          />
        )}
      </Card>
    </div>
  );
}

export default Report;
