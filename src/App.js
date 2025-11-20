import React, { useState, useEffect } from "react";
import { Button, Card, Input, Table } from "antd";
import { useVesselManualExcelDataMutation } from "../../redux/services/uploadApi";
import ReportFilter from "./ReportFilter";
import { Eye, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

function Report() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeFromUrl = searchParams.get("type") || "obs";
  const [activeTab, setActiveTab] = useState(typeFromUrl);

  const [humanData, setHumanData] = useState([]);
  const [obsData, setObsData] = useState([]);

  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    vessel_id: "",
    category: "",
    human_name: "",
  })
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

  const [vesselManualExcelData, { isLoading, data }] = useVesselManualExcelDataMutation();

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
            if (score) {
              rows.push({
                key: `${vessel.vessel_id}-${insp.inspection_id}-${q.question_id}-${idx}`,
                vessel: vessel.vessel_name,
                inspectingCompany: insp.company_name,
                inspector: insp.inspector,
                date: insp.report_date,
                operation: insp.operation,
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
                        : null,
                risk: score.risk || null,
                status: insp.vesselsOperation || null,
                master: insp.master || null,
                cheif_engineer_name: insp.cheif_engineer_name || null,
                superintendent: insp.superintendent?.name || null,
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
    { title: "HARDWARE-HUMAN-PROCESS-PHOTO", dataIndex: "quesType", key: "quesType" },
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


  const tabs = [
    { id: "human", label: "Human", icon: <User size={16} /> },
    { id: "obs", label: "Obs", icon: <Eye size={16} /> },
  ];

  return (
    <div className="p-2 bg-gray-200 rounded-sm">
      {/* Main Head */}
      <div className="flex justify-between items-center mb-6 p-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent print:ml-2">
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
      <div className="flex items-center justify-end mb-2">
        {/* <div className="flex space-x-6">
          <button
            onClick={() => typeChange("obs")}
            className={`flex items-center justify-center min-w-[120px] pb-2 relative text-sm font-semibold transition-colors duration-200
        ${activeTab === "obs" ? "text-indigo-400" : "text-gray-400 hover:text-black"}`}
          >
            OBS
            {activeTab === "obs" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded"></span>
            )}
          </button>

          <button
            onClick={() => typeChange("human")}
            className={`flex items-center justify-center min-w-[120px] pb-2 relative text-sm font-semibold transition-colors duration-200
        ${activeTab === "human" ? "text-indigo-400" : "text-gray-400 hover:text-black"}`}
          >
            HUMAN
            {activeTab === "human" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded"></span>
            )}
          </button>
        </div> */}
      </div>

      <div className="mb-2">
        <ReportFilter filters={filters} onChange={setFilters} type={activeTab} />
      </div>

      {/* Conditional Tables */}
      <Card className="">
        {activeTab === "human" ? (
          <Table
            loading={isLoading}
            dataSource={humanData}
            columns={humanColumns}
            pagination={false}
            bordered
            scroll={{ x: 2000 }}
            sticky={{ offsetHeader: 0 }}
          />
        ) : (
          <Table
            loading={isLoading}
            dataSource={obsData}
            columns={obsColumns.map(col => ({ ...col, width: 180 }))}
            pagination={{ pageSize: 10 }}
            bordered
            scroll={{ x: 3000 }}
            sticky={{ offsetHeader: 0 }}
          />
        )}
        {console.log(obsData)}
      </Card>
    </div>
  );
}

export default Report;


import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
        // rel="noopener noreferrer"
        >
          <h2>How to grow a stack over time</h2>
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>  
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>    
          <h2>How to grow a stack over time</h2>
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2> 
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>   
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>          
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>    
          <h2>How to grow a stack over time</h2> 
          <h2>How to grow a stack over time</h2>  
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>    
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>    
          <h2>How to grow a stack over time</h2> 
          <h2>How to grow a stack over time</h2>  
          <h2>How to grow a stack over time</h2>        
          <h2>How to grow a stack over time</h2>       
          <h2>How to grow a stack over time</h2>  
          <h2>How to grow a stack over time</h2>     
          <h2>How to grow a stack over time</h2>      
          <h2>How to grow a stack over time</h2>    
          <h2>How to grow a stack over time</h2>    
        </a>
      </header>
    </div>
  );
}

export default App;
