import React from "react";
import ReactApexChart from "react-apexcharts";
import InlineExpandableInfo from "../../components/InlineExpandableInfo";

const PositiveNegativeTMSA = ({pif={}, tmsa={}}) => {

  // Function to extract data from pif object
  const extractPifData = () => {
    const positiveData = [];
    const negativeData = [];
    const categories = [];
    const pifDescriptions = [];

    // Sort PIFs by number to ensure correct order
    const sortedPifs = Object.values(pif).sort((a, b) => 
      parseInt(a.pifNumber) - parseInt(b.pifNumber)
    );
    
    sortedPifs.forEach((pifItem) => {
      categories.push(`PIF ${pifItem.pifNumber}`);
      positiveData.push(pifItem.percentages?.positivePercentage || 0);
      negativeData.push(pifItem.percentages?.negativePercentage || 0);
      pifDescriptions.push(pifItem.pifDescription);
    });
    
    return { positiveData, negativeData, categories, pifDescriptions }; // Added pifDescriptions here
  };
  
  const { positiveData, negativeData, categories, pifDescriptions } = extractPifData(); // Added pifDescriptions here
  
  // Function to extract data from tmsa object
  const extractTmsaData = () => {
    const tmsaData = [];
    const tmsaCategories = [];
    
    // Sort TMSA by code to ensure correct order
    const sortedTmsa = Object.values(tmsa).sort((a, b) => 
      a.tmsaCode.localeCompare(b.tmsaCode)
    );
    
    sortedTmsa.forEach((tmsaItem) => {
      tmsaCategories.push(tmsaItem.tmsaCode);
      tmsaData.push(tmsaItem.average || 0);
    });
    
    return { tmsaData, tmsaCategories };
  };
  
  const { tmsaData, tmsaCategories } = extractTmsaData();

  // Common chart configuration
  const commonOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      offsetX: 10,
      offsetY: 10
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4,
        endingShape: "rounded",
        dataLabels: {
          position: "top"
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#000"],
        fontWeight: 'bold'
      }
    },
    grid: {
      padding: {
        top: 30
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        dataLabels: {
          enabled: false
        }
      }
    }]
  };

  // Data for Positive vs Negative chart
  const positiveNegativeOptions = {
    ...commonOptions,
    chart: {
      ...commonOptions.chart,
      stacked: false
    },
    title: {
      text: "Positive vs Negative Observations by PIF",
      align: "center",
      style: {
        fontSize: "16px",
        fontWeight: "bold"
      }
    },
    dataLabels: {
      ...commonOptions.dataLabels,
      formatter: (val) => val > 0 ? `${val.toFixed(1)}%` : ""
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: "Percentage",
        style: {
          fontSize: '14px'
        }
      },
      labels: {
        formatter: (val) => `${val}%`
      }
    },
    colors: ["#2ca02c", "#d62728"], // Green for positive, red for negative
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: '14px',
      markers: {
        width: 12,
        height: 12,
        radius: 12
      }
    },
    tooltip: {
      followCursor: false,
      fixed: {
        enabled: true,
        position: 'topRight',
        offsetX: -20,
        offsetY: 20
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const seriesName = w.globals.seriesNames[seriesIndex];
        const value = series[seriesIndex][dataPointIndex];
        const pifDescription = pifDescriptions[dataPointIndex];
        
        return `
          <div style="
            padding: 16px; 
            background: #fff; 
            border-radius: 8px; 
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); 
            border: 1px solid #e1e5e9; 
            min-width: 280px; 
            max-width: 400px; 
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="
              font-weight: 600; 
              margin-bottom: 12px; 
              color: #1f2937; 
              font-size: 14px; 
              line-height: 1.5;
              word-wrap: break-word;
              white-space: normal;
            ">
              ${pifDescription}
            </div>
            <div style="
              color: #6b7280; 
              font-size: 13px;
              padding-top: 8px;
              border-top: 1px solid #f3f4f6;
            ">
              <strong style="color: #374151;">${seriesName}:</strong> 
              <span style="font-weight: 700; color: #059669; font-size: 14px;">${value.toFixed(1)}%</span>
            </div>
          </div>
        `;
      }
    }
  };

  const positiveNegativeSeries = [
    {
      name: "Positive Observations",
      data: positiveData
    },
    {
      name: "Negative Observations",
      data: negativeData
    }
  ];

  // Data for Negative obs per TMSA chart
  const negativeTMSAOptions = {
    ...commonOptions,
    title: {
      text: "Negative Observations per TMSA Chapter",
      align: "center",
      style: {
        fontSize: "16px",
        fontWeight: "bold"
      }
    },
    dataLabels: {
      ...commonOptions.dataLabels,
      formatter: (val) => val > 0 ? val.toFixed(2) : ""
    },
    xaxis: {
      categories: tmsaCategories,
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: "Observation Rate",
        style: {
          fontSize: '14px'
        }
      },
      min: 0,
      max: 0.25,
      tickAmount: 5,
      labels: {
        formatter: (val) => val.toFixed(2)
      }
    },
    colors: ["#1f77b4"],
    tooltip: {
      y: {
        formatter: (val) => val.toFixed(2)
      }
    }
  };

  const negativeTMSASeries = [
    {
      name: "Negative Observations",
      data: tmsaData
    }
  ];

  return (
    <div className="space-y-6 p-4">
      {/* Heading */}
      <div className="bg-blue-50 p-4 rounded-lg shadow text-start">
        <div className="flex items-center gap-2">
        <h2 className="text-gray-800 font-bold text-lg md:text-xl">
          Positive/Negative Observations & TMSA Analysis
        </h2>
        <InlineExpandableInfo
                    explanation={[
                        pif?.pif_2?.percentages?.calculation,
                        tmsa?.tmsa_9A_1_1_2?.calculation
                    ]}
                />
                </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <ReactApexChart
            options={positiveNegativeOptions}
            series={positiveNegativeSeries}
            type="bar"
            height={400}
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <ReactApexChart
            options={negativeTMSAOptions}
            series={negativeTMSASeries}
            type="bar"
            height={400}
          />
        </div>
      </div>
    </div>
  );
};

export default PositiveNegativeTMSA;