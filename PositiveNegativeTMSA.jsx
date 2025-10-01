

import React, { useRef, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import InlineExpandableInfo from "../../components/InlineExpandableInfo";
import { useDispatch, useSelector } from "react-redux";
import { addChartForPdf } from "../../redux/reducers/dataReducers";

const PositiveNegativeTMSA = ({ pif = {}, tmsa = {} }) => {
  const dispatch = useDispatch();
  const chartsComments = useSelector((state) => state.data.chartsComments);
  const positiveChartRef = useRef(null);
  const negativeChartRef = useRef(null);
  const groupedTmsaChartRef = useRef(null);

  const allPifDescriptions = [
        "1. Opportunity to learn or practice",
        "2. Custom and practice surrounding use of procedures",
        "3. Procedures accessible, helpful, understood and accurate for task",
        "4. Procedures, task plans and risk assessments reflect actual working practice",
        "5. Time available and allocated for task",
        "6. Administrative burden / work load",
        "7. Physical environment and workplace layout",
        "8. Adequacy of tools and equipment",
        "9. Recognition of Safety criticality of the task or associated steps"
    ];

  // Extract PIF data
  // const extractPifData = () => {
  //   const positiveData = [];
  //   const negativeData = [];
  //   const categories = [];
  //   const pifDescriptions = [];

  //   const sortedPifs = Object.values(pif).sort((a, b) => parseInt(a.pifNumber) - parseInt(b.pifNumber));
  //   sortedPifs.forEach((pifItem) => {
  //     categories.push(`PIF ${pifItem.pifNumber}`);
  //     positiveData.push(pifItem.percentages?.positivePercentage || 0);
  //     negativeData.push(pifItem.percentages?.negativePercentage || 0);
  //     pifDescriptions.push(pifItem.pifDescription);
  //   });

  //   return { positiveData, negativeData, categories, pifDescriptions };
  // };
  const extractPifData = () => {
  const defaultPifs = Array.from({ length: 9 }, (_, i) => ({
    pifNumber: i + 1,
    pifDescription: allPifDescriptions[i],
    percentages: { positivePercentage: 0, negativePercentage: 0 }
  }));

  // Merge API data into defaultPifs
  const apiPifs = Object.values(pif);
  apiPifs.forEach(apiPif => {
    const index = defaultPifs.findIndex(d => d.pifNumber === parseInt(apiPif.pifNumber));
    if (index !== -1) {
      defaultPifs[index] = {
        ...defaultPifs[index],
        percentages: {
          positivePercentage: apiPif.percentages?.positivePercentage || 0,
          negativePercentage: apiPif.percentages?.negativePercentage || 0
        }
      };
    }
  });

  const positiveData = defaultPifs.map(p => p.percentages.positivePercentage);
  const negativeData = defaultPifs.map(p => p.percentages.negativePercentage);
  const categories = defaultPifs.map(p => `PIF ${p.pifNumber}`);
  const pifDescriptions = defaultPifs.map(p => p.pifDescription);

  return { positiveData, negativeData, categories, pifDescriptions };
};

  const { positiveData, negativeData, categories, pifDescriptions } = extractPifData();

  // Extract TMSA data
const extractTmsaData = () => {
    
    if (!tmsa || typeof tmsa !== 'object' || Array.isArray(tmsa) || Object.keys(tmsa).length === 0) {
        return { 
            tmsaData: [], 
            tmsaCategories: [], 
            tmsaGroupedData: [] 
        };
    }

    const tmsaData = [];
    const tmsaCategories = [];
    const tmsaGroupedMap = {}; 

    const sortedTmsa = Object.values(tmsa).sort((a, b) => a.tmsaCode.localeCompare(b.tmsaCode));

    sortedTmsa.forEach((tmsaItem) => {
        const code = tmsaItem.tmsaCode;
        const average = parseFloat(tmsaItem.average) || 0; 
        tmsaCategories.push(code);
        tmsaData.push(average);

        const groupMatch = code.match(/^([0-9A-Z]+)/);
        const groupKey = groupMatch ? groupMatch[1] : 'Other';

        if (!tmsaGroupedMap[groupKey]) {
            tmsaGroupedMap[groupKey] = {
                name: `${groupKey}`, 
                combinedValue: 0,
                items: []
            };
        }

        tmsaGroupedMap[groupKey].combinedValue += average; 
        tmsaGroupedMap[groupKey].items.push(code); 
    });

    const tmsaGroupedData = Object.values(tmsaGroupedMap).map(group => ({
        ...group,
        combinedValue: Number(group.combinedValue.toFixed(4)) 
    }));

    return { 
        tmsaData, 
        tmsaCategories, 
        tmsaGroupedData
    };
};

  const { tmsaData, tmsaCategories, tmsaGroupedData } = extractTmsaData();
  console.log(tmsaGroupedData);

  const negativeTMSASeries = [{ name: "Negative Observations", data: tmsaData }];
  const groupedTMSAValues = tmsaGroupedData?.map((item) => ({ y: item.combinedValue, name: item.name }));  
  const groupedTMSACategories = groupedTMSAValues?.map((item) => item.name);
  const simpleGroupedValues = groupedTMSAValues?.map(d => d.y);
  console.log(simpleGroupedValues);
  
  
  const groupedTMSASeries = [{ name: "Combined Negative Observations", data: groupedTMSAValues }];

  const commonOptions = {
    chart: { type: "bar", toolbar: { show: false }, offsetX: 10, offsetY: 10 },
    plotOptions: { bar: { horizontal: false, columnWidth: "60%", borderRadius: 4, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", endingShape: "flat", dataLabels: { position: "top" } } },
    dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', colors: ["#000"], fontWeight: 'bold' } },
    grid: { padding: { top: 30 } },
    responsive: [{ breakpoint: 768, options: { dataLabels: { enabled: false } } }]
  };

  const positiveNegativeOptions = {
    ...commonOptions,
    chart: { ...commonOptions.chart, stacked: false },
    title: { align: "center", style: { fontSize: "16px", fontWeight: "bold" } },
    dataLabels: { ...commonOptions.dataLabels, formatter: (val) => val > 0 ? `${val.toFixed(1)}%` : "" },
    xaxis: { categories, labels: { style: { fontSize: '12px' } } },
    yaxis: { title: { text: "Percentage", style: { fontSize: '14px' } }, labels: { formatter: (val) => `${val}%` } },
    colors: ["#2ca02c", "#d62728"],
    legend: { position: "bottom", horizontalAlign: "center", fontSize: '14px', markers: { width: 12, height: 12, radius: 12 } },
        tooltip: {
      shared: true,
      intersect: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        // ✅ Fetch the PIF description based on index
        const pifHeading = allPifDescriptions[dataPointIndex] || `PIF ${dataPointIndex + 1}`;

        // ✅ Create tooltip HTML
        const values = series
          .map(
            (s, i) => `
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span style="color: ${w.globals.colors[i]}; margin-right: 10px;">
                ${w.config.series[i].name}:
              </span>
              <span style="font-weight: bold;">${s[dataPointIndex].toFixed(1)}%</span>
            </div>`
          )
          .join("");

        return `
        <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 220px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #333; font-size: 12px;">
            ${pifHeading}
          </div>
          ${values}
        </div>
      `;
      }
    }
  };

  const positiveNegativeSeries = [
    { name: "Positive Observations", data: positiveData },
    { name: "Negative Observations", data: negativeData }
  ];
  
  const negativeTMSAOptions = {
    ...commonOptions,
    chart: { ...commonOptions.chart, height: 450 },
    plotOptions: { bar: { ...commonOptions.plotOptions.bar, columnWidth: "40%", }, },
    title: { align: "center", style: { fontSize: "16px", fontWeight: "bold" } },
    dataLabels: { ...commonOptions.dataLabels, formatter: (val) => (val > 0 ? val.toFixed(4) : ""), offsetY: -15, style: { fontSize: "10px", colors: ["#000"], fontWeight: "bold" } },
    xaxis: { categories: tmsaCategories, labels: { rotate: -45, style: { fontSize: "10px" }, trim: true, hideOverlappingLabels: true, } },
    yaxis: { title: { text: "Observation Rate", style: { fontSize: "14px" } }, min: 0, max: Math.max(...tmsaData) * 1.2, tickAmount: 5, labels: { formatter: (val) => val.toFixed(2) } },
    grid: { padding: { bottom: 40 } },
    colors: ["#1f77b4"],
    tooltip: { y: { formatter: (val) => val.toFixed(4) } }
  };

  const groupedTMSAOptions = {
    ...commonOptions,
    chart: { ...commonOptions.chart, height: 450 },
    plotOptions: {
      bar: { ...commonOptions.plotOptions.bar, columnWidth: "50%" },
    },
    title: {
      align: "center",
      text: "Negative Observations per TMSA Chapter (Grouped)", // New title
      style: { fontSize: "16px", fontWeight: "bold" },
    },
    dataLabels: {
      ...commonOptions.dataLabels,
      formatter: (val) => (val > 0 ? val.toFixed(4) : ""),
      offsetY: -15,
      style: { fontSize: "10px", colors: ["#000"], fontWeight: "bold" },
    },
    xaxis: {
      categories: groupedTMSACategories,
      labels: {
        rotate: -45,
        style: { fontSize: "10px" },
        trim: true,
        hideOverlappingLabels: false,
      },
    },
    yaxis: {
      title: { text: "Combined Observation Rate", style: { fontSize: "14px" } },
      min: 0,
      max: simpleGroupedValues.length > 0 ? Math.max(...simpleGroupedValues) * 1.2 : 1,
      tickAmount: 5,
      labels: { formatter: (val) => val.toFixed(2) },
    },
    grid: { padding: { bottom: 40 } },
    colors: ["#9467bd"],
    tooltip: {
      y: { formatter: (val) => val.toFixed(4) },
      // Custom tooltip to show combined value and included codes
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        // tmsaGroupedData is fine here since it holds the 'items' and 'combinedValue'
        const group = tmsaGroupedData[dataPointIndex];
        const combinedValue = group.combinedValue;
        const itemsList = group.items.map(item => `<li>${item}</li>`).join('');

        return `
          <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 220px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #333; font-size: 12px;">
              Chapter ${group.name} // <-- ADD 'Chapter' prefix here if desired
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span style="color: ${w.globals.colors[seriesIndex]}; margin-right: 10px;">
                Combined Value:
              </span>
              <span style="font-weight: bold;">${combinedValue.toFixed(4)}</span>
            </div>
            ${group.items.length > 1 ? `<div style="margin-top: 8px; font-size: 11px;">Includes: <ul>${itemsList}</ul></div>` : ''}
          </div>
        `;
      }
    },
  };

  // Dispatch charts for PDF
  useEffect(() => {
    const timer = setTimeout(() => {
      // Positive chart -> comment null
      if (positiveChartRef.current) {
        const svg = positiveChartRef.current.querySelector("svg")?.outerHTML;
        if (svg) {
          dispatch(addChartForPdf({
            id: 20,
            title: "Positive vs Negative Observations by PIF",
            svg,
            comments: null
          }));
        }
      }

      // Negative chart -> comment "tmsa_trends"
      if (negativeChartRef.current) {
        const svg = negativeChartRef.current.querySelector("svg")?.outerHTML;
        if (svg) {
          const comment = chartsComments.find(c => c.name === "tmsa_trends")?.note || null;
          dispatch(addChartForPdf({
            id: 21,
            title: "Negative Observations per TMSA Chapter",
            svg,
            name: "tmsa_trends",
            // comments: comment
          }));
        }
      }
      if (groupedTmsaChartRef.current) {
        const svg = groupedTmsaChartRef.current.querySelector("svg")?.outerHTML;
        if (svg) {
          const comment =
            chartsComments.find((c) => c.name === "tmsa_grouped_trends")?.note || null;
          dispatch(
            addChartForPdf({
              id: 22, // Assign a unique ID
              title: "Negative Observations per TMSA Chapter (Grouped)",
              svg,
              name: "tmsa_grouped_trends", // A new name for its comment
              // comments: comment 
            })
          );
        }
      }

    }, 3000);

    return () => clearTimeout(timer);
  }, [dispatch, chartsComments, pif, tmsa]);

  return (
    <div className="space-y-6 p-4">
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

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> */}

        <div className="bg-white px-4 rounded-lg shadow">
          <h3 className="text-base font-semibold text-gray-800 text-center">
            Positive vs Negative Observations by PIF
          </h3>
          <div className="bg-white p-4 rounded-lg shadow" ref={positiveChartRef}>
            <ReactApexChart
              options={positiveNegativeOptions}
              series={positiveNegativeSeries}
              type="bar"
              height={400}
            />
          </div>
        </div>


        <div className="bg-white px-4 rounded-lg shadow">
          <h3 className="text-base font-semibold text-gray-800 text-center">
            Negative Observations per TMSA Chapter
          </h3>
          <div className="bg-white p-4 rounded-lg shadow" ref={negativeChartRef}>
            <ReactApexChart
              options={negativeTMSAOptions}
              series={negativeTMSASeries}
              type="bar"
              height={400}
            />
          </div>
        </div>

        <div className="bg-white px-4 rounded-lg shadow">
          <h3 className="text-base font-semibold text-gray-800 text-center">
            Negative Observations per TMSA Chapter (Grouped)
          </h3>
          <div className="bg-white p-4 rounded-lg shadow" ref={groupedTmsaChartRef}>
            <ReactApexChart
              options={groupedTMSAOptions}
              series={groupedTMSASeries}
              type="bar"
              height={400}
            />
          </div>
        </div>

      {/* </div> */}
    </div>
  );
};

export default PositiveNegativeTMSA;