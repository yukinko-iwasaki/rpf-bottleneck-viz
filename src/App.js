import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import Plot from 'react-plotly.js';

// Main App component
const App = () => {
  // Raw hierarchical data structure based on the user's input
  const rawDataTree = {
    "Role of Public Finance": {
      "Commitment to Feasible Policy": {
        "Insufficient Stakeholder Commitment to Policy Action": [
          "Inadequate commitment of political and technical leadership to policy action and associated resource mobilization and use within or across sectors",
          "Inadequately broad-based stakeholder involvement, understanding and support for policy action and associated resource mobilization and use"
        ],
        "Incoherence and fragmentation of policy": [
          "Fragmented, inconsistent and uncoordinated policies across or within sectors",
        ],
        "Mismatch between policy goals, capability and resources": [
          "Domestic revenue policies generate insufficient resources to achieve policy goals given fiscal reality",
          "Public policy goals are unaffordable given costs and fiscal reality",
          "Policies do not take into account the available organizational capability to achieve goals",
        ]
      },
      "Fiscal sustainability": {
        "Unsustainable fiscal situation of governments and organizations": [
        "Short term biases lead to pro-cyclical spending and force deep cuts during downturns",
        "Biased or inaccurate fiscal forecasting and unpredictable, volatile resource flows result in budgets being under-funded",
          "Un-strategic, ad hoc and supply driven debt management undermines fiscal consolidation and reduces fiscal space",
          "Pre-existing spending commitments and debt burdens create budget rigidity and limit options for fiscal consolidation and/or increasing fiscal space",
          "Financial unviability of providers and utilities",
        ]
      },
      "Effective Resource Mobilization & Distribution": {
        "Inadequate and inequitable resources mobilized and deployed for policy implementation": [
        "Limited or costly financing mobilized for public Investment and service delivery",
          "Resource deployment is often incremental and disconnected from public policy priorities",
          "Resource deployment is not informed by demand or costs of achieving public policy objectives",
          "Unequal and inequitable resource mobilization and distribution, misaligned with policy and effective delivery",
        ],
        "Unreliable, delayed and fragmented funding for delivery": [
        "Ad hoc, political and fragmented funding channels contributes to ineffective and inefficient delivery",
          "Shortfalls, delays and diversion of funding for delivery",
        ],
        "Inefficient deployment and management of resources and inputs for delivery": [
        "Inefficient public investment decisions and management of assets",
          "Inefficient deployment and poor motivation and inadequate skills of frontline and other staff",
          "Limited availability of operational resources relative to salaries and delivery infrastructure",
          "Delays in and inflated cost of procurement for infrastructure and operational inputs",
          "Weak management of resources at national and subnational levels up to the point of delivery"
        ]
      },
      "Performance & Accountability in Delivery": {
        "Incentives, management oversight, and accountability systems and institutions fail to enable and encourage performance as intended": [
          "The design of regulatory, incentive, control and management systems limits autonomy and discourages performance",
          "Non-compliance and weak enforcement of regulatory, PFM and public sector management systems undermines performance and accountability",
          "Weaknesses in fiscal governance undermine public and private investment and action",
          "Inadequate oversight, monitoring, evaluation and accountability for resources and performance"
        ],
        "Inadequate use of fragmented sector and financial data in decision making for policy and delivery.": [
          "Available financial and non-financial information not used for decision making, management and accountability",
          "Data systems are fragmented and do not interoperate"
        ]
      }
    }
  };
  

  // State to hold the transformed data, including node information for hierarchy navigation
  const [transformedData, setTransformedData] = useState({ ids: [], labels: [], parents: [], values: [], colors: [], nodeInfo: {} , textColors: [] });
  // State to control the currently "centered" level in the sunburst chart
  const [currentLevelId, setCurrentLevelId] = useState(''); // Initially, the root is centered (empty string)

  // States for managing the pop-out table
  const [showPopoutTable, setShowPopoutTable] = useState(false);
  const [popoutTableRows, setPopoutTableRows] = useState([]);

  // Ref to store the Plotly.js graphDiv for event handling
  const graphDivRef = useRef(null);

  /**
   * Helper function to wrap text by inserting <br> tags.
   * It tries to break at spaces to avoid breaking words.
   * @param {string} text - The input text to wrap.
   * @param {number} maxLength - The maximum length of a line before wrapping.
   * @returns {string} The wrapped text with <br> tags.
   */
  const wrapText = (text, maxLength) => {
    if (text.length <= maxLength) {
      return text;
    }
    const words = text.split(' ');
    let currentLine = '';
    let wrappedText = '';

    words.forEach((word, index) => {
      if ((currentLine + word).length > maxLength && currentLine.length > 0) {
        wrappedText += currentLine.trim() + '<br>';
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
      if (index === words.length - 1) {
        wrappedText += currentLine.trim();
      }
    });
    return wrappedText;
  };

  /**
   * Generates an array of sample text strings for table rows.
   * @param {number} numRows - The desired number of rows.
   * @param {number} charPerLine - The approximate number of characters per line for each row.
   * @returns {string[]} An array of sample text strings.
   */
  const generateSampleRows = (numRows, charPerLine) => {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. `;
    let text = '';
    const rows = [];
    for (let i = 0; i < numRows; i++) {
      text = ''; // Reset text for each row
      while (text.length < charPerLine) {
        text += loremIpsum;
      }
      rows.push(text.substring(0, charPerLine));
    }
    return rows;
  };

  /**
   * Transforms the raw hierarchical data into the format required by Plotly's sunburst chart.
   * This version now includes the "PF Bottleneck" layer and assigns colors based on hierarchy groups.
   * @param {object} dataTree - The raw hierarchical data.
   * @returns {{ids: string[], labels: string[], parents: string[], values: number[], colors: string[], nodeInfo: object, textColors:string[]}}
   */
  const transformDataForSunburst = (dataTree) => {
    const ids = [];
    const labels = [];
    const parents = [];
    const values = [];
    const colors = [];
    const nodeValues = {};
    const nodeInfo = {};
    const textColors = []; // This will hold text colors if needed
    let idCounter = 0;
    const idMap = new Map();

    const TEXT_WRAP_MAX_LENGTH = 25;

    // Define color palettes for each main challenge group
    const COLOR_PALETTES_BY_GROUP = {
      "Role of Public Finance": {
        level0: '#FFFFFF'
      },
      "Commitment to Feasible Policy": { // New top-level group
        level1: '#F84B64', // Purple
        level2: '#C9E7F8', // Lighter Purple
        level3: '#D2B4DE'  // Even Lighter Purple
      },
      "Insufficient Stakeholder Commitment to Policy Action": {
        level1: 'FF848B', // Purple (fallback if not nested)
        level2: '#C9E7F8', // Lighter Purple (fallback)
        level3: '#D2B4DE'  // Even Lighter Purple (fallback)
      },
      "Incoherence and fragmentation of policy": {
        level1: '#f84b64', // Purple (fallback if not nested)
        level2: '#C9E7F8', // Lighter Purple (fallback)
        level3: '#D2B4DE'  // Even Lighter Purple (fallback)
      },
      "Mismatch between policy goals, capability and resources": {
        level1: '#d24989', // Purple (fallback if not nested)
        level2: '#C9E7F8', // Lighter Purple (fallback)
        level3: '#D2B4DE'  // Even Lighter Purple (fallback)
      },
      "Fiscal sustainability": {
        level1: '#F84B64', // Dark Red
        level2: '#C9E7F8', // Red
        level3: '#F1948A'  // Light Red
      },
      "Unsustainable fiscal situation of governments and organizations": {
        level1: '#C0392B', // Dark Red (fallback)
        level2: '#C9E7F8', // Red (fallback)
        level3: '#F1948A'  // Light Red (fallback)
      },
      "Effective Resource Mobilization & Distribution": {
        level1: 'FF848B', // Dark Green
        level2: '#C9E7F8', // Green
        level3: '#A9DFBF'  // Light Green
      },
      "Inadequate and inequitable resources mobilized and deployed for policy implementation": {
        level1: '#27AE60', // Dark Green (fallback)
        level2: '#C9E7F8', // Green (fallback)
        level3: '#A9DFBF'  // Light Green (fallback)
      },
      "Unreliable, delayed and fragmented funding for delivery": {
        level1: '#27AE60', // Dark Green (fallback)
        level2: '#C9E7F8', // Green (fallback)
        level3: '#A9DFBF'  // Light Green (fallback)
      },
      "Inefficient deployment and management of resources and inputs for delivery": {
        level1: '#27AE60', // Dark Green (fallback)
        level2: '#C9E7F8', // Green (fallback)
        level3: '#A9DFBF'  // Light Green (fallback)
      },
      "Performance & Accountability in Delivery": {
        level1: 'FF848B', // Dark Blue
        level2: '#C9E7F8', // Blue
        level3: '#85C1E9'  // Light Blue
      },
      "Incentives, management oversight, and accountability systems and institutions fail to enable and encourage performance as intended": {
        level1: '#2980B9', // Dark Blue (fallback)
        level2: '#C9E7F8', // Blue (fallback)
        level3: '#85C1E9'  // Light Blue (fallback)
      },
      "Inadequate use of fragmented sector and financial data in decision making for policy and delivery.": {
        level1: '#2980B9', // Dark Blue (fallback)
        level2: '#C9E7F8', // Blue (fallback)
        level3: '#85C1E9'  // Light Blue (fallback)
      }
    };

    // Keep track of the top-level challenge for color assignment
    const nodeGroupColor = {};

    const generateUniqueId = (label) => {
      if (idMap.has(label)) {
        return idMap.get(label);
      }
      const newId = `node-${idCounter++}`;
      idMap.set(label, newId);
      return newId;
    };

    const addNode = (label, parentId, initialValue, depth, color) => {
      const id = generateUniqueId(label);
      ids.push(id);
      labels.push(wrapText(label, TEXT_WRAP_MAX_LENGTH));
      parents.push(parentId);
      values.push(initialValue);
      colors.push(color);
      const textColor = ['#F84B64', 'FF848B'].includes(color)? '#FFFFFF' : 'black'; // Use white text for pink, black for others
      textColors.push(textColor)
      nodeValues[id] = initialValue;
      nodeInfo[id] = { label, parentId, depth, children: [] };

      if (parentId) {
        if (nodeInfo[parentId]) {
          nodeInfo[parentId].children.push(id);
        }
      }
      return id;
    };

    // Add the root node: "Role of Public Finance" (Depth 0)
    const rootLabel = Object.keys(dataTree)[0];
    const rootId = addNode(rootLabel, '', 0, 0, COLOR_PALETTES_BY_GROUP[rootLabel].level0);

    // Iterate through the first level (e.g., "Commitment to Feasible Policy", "Fiscal sustainability" - Depth 1)
    for (const level1Label in dataTree[rootLabel]) {
      const level1Color = COLOR_PALETTES_BY_GROUP[level1Label].level1;
      const level1Id = addNode(level1Label, rootId, 0, 1, level1Color);
      nodeGroupColor[level1Id] = level1Label; // Store the group name for children

      // Iterate through the second level (e.g., "Insufficient Stakeholder Commitment to Policy Action", "Unsustainable fiscal situation of governments and organizations" - Depth 2)
      for (const level2Label in dataTree[rootLabel][level1Label]) {
        const level2Color = COLOR_PALETTES_BY_GROUP[nodeGroupColor[level1Id]].level2;
        const level2Id = addNode(level2Label, level1Id, 0, 2, level2Color);
        nodeGroupColor[level2Id] = nodeGroupColor[level1Id]; // Pass group name to children

        const policies = dataTree[rootLabel][level1Label][level2Label];
        policies.forEach(policyLabel => {
          // Get color from the bottleneck's group palette for level3
          const policyColor = COLOR_PALETTES_BY_GROUP[nodeGroupColor[level2Id]].level3;
          const policyId = addNode(policyLabel, level2Id, 1, 3, policyColor); // Leaf node has a value of 1
          // Sum up values for parent (level2)
          nodeValues[level2Id] = (nodeValues[level2Id] || 0) + nodeValues[policyId];
        });
        // Sum up values for parent (level1) after all children (policies under this level2) are processed
        nodeValues[level1Id] = (nodeValues[level1Id] || 0) + nodeValues[level2Id];
      }
      // Sum up values for parent (root) after all children (level2s under this level1) are processed
      nodeValues[rootId] = (nodeValues[rootId] || 0) + nodeValues[level1Id];
    }

    // After calculating all sums, update the 'values' array with the final calculated values
    for (let i = 0; i < ids.length; i++) {
      values[i] = nodeValues[ids[i]];
    }

    return { ids, labels, parents, values, colors, nodeInfo, textColors };
  };

  // Effect to run transformation once on component mount
  useEffect(() => {
    const data = transformDataForSunburst(rawDataTree);
    setTransformedData(data);
    // Set initial level to the root ID after transformation
    if (data.ids.length > 0) {
      setCurrentLevelId(data.ids[0]); // First ID is always the root
    }
  }, []); // Empty dependency array means this runs once on mount

  // Function to close the pop-out table
  const closePopoutTable = () => {
    setShowPopoutTable(false);
    setPopoutTableRows([]);
  };

  // Handle click events on the sunburst chart (for zooming and pop-out)
  const handlePlotClick = (eventData) => { // Wrapped in useCallback
    if (eventData.points && eventData.points.length > 0) {
      eventData.event.stopPropagation(); // Prevent event bubbling
      const clickedNodeId = eventData.points[0].id;
      const clickedNodeInfo = transformedData.nodeInfo[clickedNodeId];
      const rootId = transformedData.ids[0]; // Get the actual root ID

      if (clickedNodeInfo) {
        if (clickedNodeInfo.depth === 0) {
          // Clicked the root: reset to show root and its children
          setCurrentLevelId(prevId=>clickedNodeId);
          closePopoutTable(); // Close table if open
        } else if (clickedNodeInfo.depth === 1) {
          // Clicked a "Commitment to Feasible Policy" or "Fiscal sustainability" (Depth 1)
          if (currentLevelId === clickedNodeId) {
            // If currently zoomed into this specific level1, zoom out to root view
            setCurrentLevelId(prevId => rootId)
          } else {
            // If currently at the root view or another level1, zoom into this level1
            setCurrentLevelId(prevId => clickedNodeId)
          }
          closePopoutTable(); // Close table if open
        } else if (clickedNodeInfo.depth === 2) {
          // Clicked a "PF Bottleneck" or similar (Depth 2)
          if (currentLevelId === clickedNodeId) {
            // If currently zoomed into this specific level2, zoom out to its parent level1
            setCurrentLevelId(prevId => transformedData.nodeInfo[clickedNodeId].parentId);
          } else {
            // If currently at a higher level, zoom into this level2
            setCurrentLevelId(prevId => clickedNodeId);
          }
          closePopoutTable(); // Close table if open
        } else if (clickedNodeInfo.depth === 3) {
          // Clicked a "Policy" (outermost layer - Depth 3): show pop-out table
          setPopoutTableRows(generateSampleRows(6, 80)); // Generate 6 rows, ~80 chars each
          setShowPopoutTable(true);
        }
      }
    }
  }
  // Define the data for the sunburst chart using the transformed data
  const plotData = [
    {
      type: 'sunburst',
      ids: transformedData.ids,
      labels: transformedData.labels,
      parents: transformedData.parents,
      values: transformedData.values,
      branchvalues: 'total', // Sum of children's values for internal nodes
      hoverinfo: 'none', // Removed default hoverinfo to hide Plotly's default tooltip
      marker: {
        colors: transformedData.colors, // Use the custom colors array
        line: { // Added line properties for separators
          color: '#333333', // Dark color for lines
          width: 1 // Thin lines
        }
      },
      textfont: {
        size: 12, // Adjust font size for better readability of labels
        color: transformedData.textColors // Use the text colors array
      },
      textinfo: 'label', // Display only the label, not value or percentage - ensures text is shown
      textorientation: 'horizontal', // Explicitly set textorientation to 'horizontal'
      level: currentLevelId, // Control the centered node
      maxdepth: 2, // Show only 2 layers at once (current level + 1 child layer)
      insidetextfont: {
        size: 10 // Can adjust font size for inner text if needed
      }
    }
  ];

  // Define the layout for the Plotly chart
  const layout = {
    title: 'Public Finance: Challenges and Policy Commitments', // Updated title
    autosize: true, // Chart will resize with its container
    margin: { l: 0, r: 0, b: 0, t: 50 }, // Adjust margins to give more space
    paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background for the plot area
    plot_bgcolor: 'rgba(0,0,0,0)', // Transparent background for the plot itself
    font: {
      family: 'Inter, sans-serif' // Consistent font family
    }
  };

  // Define the configuration options for the Plotly chart
  const config = {
    responsive: true, // Make the chart responsive to container size changes
    displayModeBar: true, // Show the mode bar (zoom, pan, etc.)
    scrollZoom: true // Enable scroll zoom functionality
  };
  useEffect(() => {
    // Ensure the graphDivRef is set correctly after the component mounts
    if (graphDivRef.current) {
      graphDivRef.current.on('plotly_click', handlePlotClick);
    }
    return () => {
      // Cleanup event listener on unmount
      if (graphDivRef.current) {
        graphDivRef.current.removeListener('plotly_click', handlePlotClick);
      }
    };
  }, [handlePlotClick]); // Dependency on handlePlotClick to ensure it updates correctly

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f3f4f6', // Equivalent to bg-gray-100
      padding: '1rem',
      position: 'relative',
      fontFamily: 'Inter, sans-serif' // Apply font globally
    }}>
      {/* Style block for cursor pointer on sunburst segments */}
      <style>
        {`
          .js-plotly-plot .slice {
            cursor: pointer;
          }
        `}
      </style>

      <h1 style={{
        fontSize: '1.875rem', // text-3xl
        fontWeight: 'bold',
        color: '#1f2937', // text-gray-800
        marginBottom: '1.5rem', // mb-6
        borderRadius: '0.5rem', // rounded-lg
        padding: '0.5rem', // p-2
        backgroundColor: '#ffffff', // bg-white
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-md
        textAlign: 'center'
      }}>
        Public Finance: Challenges & Policies
      </h1>
      <div style={{
        width: '100%',
        maxWidth: '80rem', // max-w-5xl (approximate, adjust as needed)
        backgroundColor: '#ffffff', // bg-white
        borderRadius: '0.5rem', // rounded-lg
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-xl
        overflow: 'hidden'
      }}>
        {transformedData.ids.length > 0 ? (
          <Plot
            data={plotData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '700px' }}
            useResizeHandler={true}
            onInitialized={(figure, graphDiv) => {
              graphDivRef.current = graphDiv; // Store the graphDiv
              graphDiv.on('plotly_click', handlePlotClick); // Attach event listener to graphDiv
            }}
            onPurge={() => { // Cleanup event listener on component unmount/re-render
              if (graphDivRef.current) {
                graphDivRef.current.removeListener('plotly_click', handlePlotClick);
              }
            }}
            onHover={() => {}}
            onUnhover={() => {}}
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '700px', color: '#4b5563' }}>
            Loading chart data...
          </div>
        )}
      </div>

      {/* Pop-out Table Modal - NO TAILWIND CSS */}
      {showPopoutTable && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Transparent black overlay
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999 // Ensure it's on top
          }}
          onClick={closePopoutTable} // Close when clicking outside the table content
        >
          <div
            style={{
              backgroundColor: '#ffffff', // White background
              borderRadius: '0.5rem', // Rounded corners
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Shadow
              padding: '1.5rem', // Padding inside
              position: 'relative',
              maxWidth: '600px', // Max width
              width: '90%', // Responsive width
              maxHeight: '80vh', // Max height for scrollable content
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the table content
          >
            <button
              onClick={closePopoutTable}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                color: '#6b7280', // Gray text
                fontSize: '1.5rem',
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1
              }}
              onMouseOver={e => e.currentTarget.style.color = '#374151'} // Darker gray on hover
              onMouseOut={e => e.currentTarget.style.color = '#6b7280'} // Revert on mouse out
              aria-label="Close"
            >
              &times;
            </button>
            <h3 style={{
              fontSize: '1.25rem', // text-xl
              fontWeight: 'semibold',
              color: '#1f2937', // Dark gray text
              marginBottom: '1rem' // Margin bottom
            }}>Extracted Text Details</h3>
            <div style={{
              overflowY: 'auto', // Enable vertical scrolling
              maxHeight: '16rem' // Max height for scrollable area
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse', // Collapse borders for single lines
                backgroundColor: '#ffffff' // White background for table
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '0.5rem 0.75rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 'medium',
                      color: '#4b5563', // Gray text
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: '1px solid #d1d5db', // Light gray border
                      backgroundColor: '#f9fafb' // Light gray background
                    }}>
                      Text
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {popoutTableRows.map((row, index) => (
                    <tr key={index}>
                      <td style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: '#374151', // Darker gray text
                        wordBreak: 'break-word', // Allow long words to break
                        border: '1px solid #d1d5db' // Light gray border
                      }}>
                        {row}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p style={{
        marginTop: '1.5rem',
        color: '#4b5563', // Gray text
        textAlign: 'center',
        maxWidth: '48rem'
      }}>
        This sunburst chart visualizes the hierarchy of Public Finance challenges and their associated policy commitments. Click on a segment to zoom in/out and view up to two layers at a time. Clicking the outermost layer segments will display a pop-out table with sample extracted text.
      </p>
    </div>
  );
};

export default App;
