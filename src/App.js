import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

// Main App component
const App = () => {
  // Raw hierarchical data structure based on the user's input
  const rawDataTree = {
    "Role of Public Finance": {
      "Insufficient Stakeholder Commitment to Policy Action": {
        "Inadequate commitment of political and technical leadership to policy action and associated resource mobilization and use within or across sectors": [
          "Inadequately broad-based stakeholder involvement, understanding and support for policy action and associated resource mobilization and use"
        ],
        "Incoherence and fragmentation of policy": [
          "Fragmented, inconsistent and uncoordinated policies across or within sectors"
        ],
        "Mismatch between policy goals, capability and resources": [
          "Domestic revenue policies generate insufficient resources to achieve policy goals given fiscal reality",
          "Public policy goals are unaffordable given costs and fiscal reality",
          "Policies do not take into account the available organizational capability to achieve goals"
        ]
      },
      "Fiscal sustainability": {
        "Unsustainable fiscal situation of governments and organizations": [
          "Short term biases lead to pro-cyclical spending and force deep cuts during downturns",
          "Biased or inaccurate fiscal forecasting and unpredictable, volatile resource flows result in budgets being under-funded",
          "Un-strategic, ad hoc and supply driven debt management undermines fiscal consolidation and reduces fiscal space",
          "Pre-existing spending commitments and debt burdens create budget rigidity and limit options for fiscal consolidation and/or increasing fiscal space",
          "Financial unviability of providers and utilities"
        ]
      },
      "Effective Resource Mobilization & Distribution": {
        "Inadequate and inequitable resources mobilized and deployed for policy implementation": [
          "Limited or costly financing mobilized for public Investment and service delivery",
          "Resource deployment is often incremental and disconnected from public policy priorities",
          "Resource deployment is not informed by demand or costs of achieving public policy objectives",
          "Unequal and inequitable resource mobilization and distribution, misaligned with policy and effective delivery"
        ],
        "Unreliable, delayed and fragmented funding for delivery": [
          "Ad hoc, political and fragmented funding channels contributes to ineffective and inefficient delivery",
          "Shortfalls, delays and diversion of funding for delivery"
        ]
      },
      "Performance & Accountability in Delivery": {
        "Inefficient deployment and management of resources and inputs for delivery": [
          "Inefficient public investment decisions and management of assets",
          "Inefficient deployment and poor motivation and inadequate skills of frontline and other staff",
          "Limited availability of operational resources relative to salaries and delivery infrastructure",
          "Delays in and inflated cost of procurement for infrastructure and operational inputs",
          "Weak management of resources at national and subnational levels up to the point of delivery"
        ],
        "Incentives, management oversight, and accountability systems and institutions fail to enable and encourage performance as intended": [
          "The design of regulatory, incentive, control and management systems limits autonomy and discourages performance",
          "Non-compliance and weak enforcement of regulatory, PFM and public sector management systems undermines performance and accountability",
          "Weaknesses in fiscal governance undermine public and private investment and action",
          "Inadequate oversight, monitoring, evaluation and accountability for resources and performance"
        ],
        "Inadequate use of fragmented sector and financial data in decision-making for policy and delivery.": [
          "Available financial and non-financial information not used for decision-making, management and accountability",
          "Data systems are fragmented and do not interoperate"
        ]
      }
    }
  };

  // State to hold the transformed data, including node information for hierarchy navigation
  const [transformedData, setTransformedData] = useState({ ids: [], labels: [], parents: [], values: [], colors: [], nodeInfo: {} });
  // State to control the currently "centered" level in the sunburst chart
  const [currentLevelId, setCurrentLevelId] = useState(''); // Initially, the root is centered (empty string)

  // States for managing the pop-out table
  const [showPopoutTable, setShowPopoutTable] = useState(false);
  const [popoutTableRows, setPopoutTableRows] = useState([]);

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
   * This version removes the "PF Bottleneck" layer, connecting "PF Challenge" directly to "Policy" (leaf nodes).
   * Generates unique IDs for each node and calculates values based on the number of leaf nodes.
   * Also builds a nodeInfo map for easy hierarchy navigation (parent, depth, children).
   * Assigns colors based on depth and alternating patterns to match the provided requirements.
   * @param {object} dataTree - The raw hierarchical data.
   * @returns {{ids: string[], labels: string[], parents: string[], values: number[], colors: string[], nodeInfo: object}}
   */
  const transformDataForSunburst = (dataTree) => {
    const ids = [];
    const labels = [];
    const parents = [];
    const values = [];
    const colors = []; // New array to store colors
    const nodeValues = {}; // Stores calculated sum of children's values for each node
    const nodeInfo = {}; // Stores info like parentId, depth, and children for each node
    let idCounter = 0;
    const idMap = new Map(); // Maps label strings to unique IDs to handle potential duplicate labels

    // Define a max length for text wrapping. Adjust this value as needed.
    const TEXT_WRAP_MAX_LENGTH = 25; // Characters per line before attempting to wrap

    // Define custom color palette based on the provided image and original requirements
    const COLOR_PALETTE = {
      root: '#FFFFFF',    // White for the root layer
      // Original alternating for the second layer (PF Challenge)
      challenge: ['#F84B64','#FF848C', '#FF848C','#F84B64'],
      // Original alternating for the outer layer (Policy)
      policy: ['#B3DCF5', '#4C9FD2']
    };

    // Counters for alternating colors in each layer
    let challengeColorIndex = 0;
    const policyColorIndices = {}; // To track policy color index per challenge parent

    /**
     * Generates a unique ID for a given label. If the label already has an ID, it returns the existing one.
     * @param {string} label - The label for which to generate a unique ID.
     * @returns {string} The unique ID for the label.
     */
    const generateUniqueId = (label) => {
      if (idMap.has(label)) {
        return idMap.get(label);
      }
      const newId = `node-${idCounter++}`; // Simple counter for unique IDs
      idMap.set(label, newId);
      return newId;
    };

    /**
     * Adds a node to the sunburst data arrays.
     * @param {string} label - The text label for the node.
     * @param {string} parentId - The ID of the parent node.
     * @param {number} initialValue - The initial value for the node (1 for leaf nodes, 0 for internal nodes).
     * @param {number} depth - The depth of the node in the hierarchy (0 for root).
     * @param {string} color - The color to assign to this node.
     * @returns {string} The ID of the newly added node.
     */
    const addNode = (label, parentId, initialValue, depth, color) => {
      const id = generateUniqueId(label);
      ids.push(id);
      labels.push(wrapText(label, TEXT_WRAP_MAX_LENGTH)); // Apply text wrapping
      parents.push(parentId);
      values.push(initialValue); // Placeholder, will be updated later with calculated sums
      colors.push(color); // Add color to the colors array
      nodeValues[id] = initialValue; // Store initial value for sum calculation
      nodeInfo[id] = { label, parentId, depth, children: [] }; // Store node info

      if (parentId) {
        // Add this node as a child to its parent
        if (nodeInfo[parentId]) {
          nodeInfo[parentId].children.push(id);
        }
      }
      return id;
    };

    // Add the root node: "Role of Public Finance" (Depth 0)
    const rootLabel = Object.keys(dataTree)[0];
    const rootId = addNode(rootLabel, '', 0, 0, COLOR_PALETTE.root);

    // Iterate through the first level (PF Challenge - Depth 1)
    for (const challengeLabel in dataTree[rootLabel]) {
      const challengeColor = COLOR_PALETTE.challenge[challengeColorIndex % COLOR_PALETTE.challenge.length];
      const challengeId = addNode(challengeLabel, rootId, 0, 1, challengeColor);
      challengeColorIndex++; // Increment for next challenge

      // Initialize policy color index for this challenge
      policyColorIndices[challengeId] = 0;

      // Iterate through the second level (PF Bottleneck - This layer is skipped in the sunburst structure)
      for (const bottleneckLabel in dataTree[rootLabel][challengeLabel]) {
        const policies = dataTree[rootLabel][challengeLabel][bottleneckLabel];
        policies.forEach(policyLabel => {
          const policyColor = COLOR_PALETTE.policy[policyColorIndices[challengeId] % COLOR_PALETTE.policy.length];
          // Policy is now a child of the Challenge (Depth 2)
          const policyId = addNode(policyLabel, challengeId, 1, 2, policyColor); // Leaf node has a value of 1
          policyColorIndices[challengeId]++; // Increment for next policy under this challenge
          // Sum up values for parent (challenge)
          nodeValues[challengeId] = (nodeValues[challengeId] || 0) + nodeValues[policyId];
        });
      }
      // Sum up values for parent (root) after all children (policies) are processed for this challenge
      // This is crucial for the root's size to reflect all its descendants
      nodeValues[rootId] = (nodeValues[rootId] || 0) + nodeValues[challengeId];
    }

    // After calculating all sums, update the 'values' array with the final calculated values
    for (let i = 0; i < ids.length; i++) {
      values[i] = nodeValues[ids[i]];
    }

    return { ids, labels, parents, values, colors, nodeInfo };
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
  const handlePlotClick = (data) => {
    if (data.points && data.points.length > 0) {
      const clickedNodeId = data.points[0].id;
      const clickedNodeInfo = transformedData.nodeInfo[clickedNodeId];
      const rootId = transformedData.ids[0]; // Get the actual root ID

      if (clickedNodeInfo) {
        if (clickedNodeInfo.depth === 0) {
          // Clicked the root: reset to show root and its children
          setCurrentLevelId(clickedNodeId);
          closePopoutTable(); // Close table if open
        } else if (clickedNodeInfo.depth === 1) {
          // Clicked a "PF Challenge" (middle layer)
          if (currentLevelId === clickedNodeId) {
            // If currently zoomed into this specific challenge, zoom out to root view
            setCurrentLevelId(rootId);
          } else {
            // If currently at the root view or another challenge, zoom into this challenge
            setCurrentLevelId(clickedNodeId);
          }
          closePopoutTable(); // Close table if open
        } else if (clickedNodeInfo.depth === 2) {
          // Clicked a "Policy" (outermost layer): show pop-out table
          setPopoutTableRows(generateSampleRows(6, 80)); // Generate 6 rows, ~80 chars each
          setShowPopoutTable(true);
        }
      }
    }
  };

  // Define the data for the sunburst chart using the transformed data
  const data = [
    {
      type: 'sunburst',
      ids: transformedData.ids,
      labels: transformedData.labels,
      parents: transformedData.parents,
      values: transformedData.values,
      branchvalues: 'total', // Sum of children's values for internal nodes
      hoverinfo: 'none', // Removed default hoverinfo to hide Plotly's default tooltip
      marker: {
        colors: transformedData.colors // Use the custom colors array
      },
      textfont: {
        size: 12 // Adjust font size for better readability of labels
      },
      textinfo: 'label', // Display only the label, not value or percentage
      textorientation: 'horizontal', // Explicitly set textorientation to 'horizontal'
      level: currentLevelId, // Control the centered node
      maxdepth: 2, // Show a maximum of 2 layers from the 'level' node
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
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '700px' }}
          useResizeHandler={true}
          onClick={handlePlotClick}
          onHover={() => {}}
          onUnhover={() => {}}
        />
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // bg-black bg-opacity-50
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999 // High z-index to ensure it's on top
          }}
          onClick={closePopoutTable} // Close when clicking outside the table content
        >
          <div
            style={{
              backgroundColor: '#ffffff', // bg-white
              borderRadius: '0.5rem', // rounded-lg
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-xl
              padding: '1.5rem', // p-6
              position: 'relative',
              maxWidth: '600px', // max-w-md (approximate, adjust as needed)
              width: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the table content
          >
            <button
              onClick={closePopoutTable}
              style={{
                position: 'absolute',
                top: '0.75rem', // top-3
                right: '0.75rem', // right-3
                color: '#6b7280', // text-gray-500
                fontSize: '1.5rem', // text-2xl
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1
              }}
              onMouseOver={e => e.currentTarget.style.color = '#374151'} // hover:text-gray-700
              onMouseOut={e => e.currentTarget.style.color = '#6b7280'} // revert on mouse out
              aria-label="Close"
            >
              &times;
            </button>
            <h3 style={{
              fontSize: '1.25rem', // text-xl
              fontWeight: 'semibold',
              color: '#1f2937', // text-gray-800
              marginBottom: '1rem' // mb-4
            }}>Extracted Text Details</h3>
            <div style={{
              overflowY: 'auto', // overflow-y-auto
              maxHeight: '16rem' // max-h-64 (approximate)
            }}>
              <table style={{
                width: '100%', // min-w-full
                borderCollapse: 'collapse', // border-collapse
                backgroundColor: '#ffffff' // bg-white
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '0.5rem 0.75rem', // py-2 px-3
                      textAlign: 'left', // text-left
                      fontSize: '0.75rem', // text-xs
                      fontWeight: 'medium',
                      color: '#4b5563', // text-gray-600
                      textTransform: 'uppercase', // uppercase
                      letterSpacing: '0.05em', // tracking-wider
                      border: '1px solid #d1d5db', // border border-gray-300
                      backgroundColor: '#f9fafb' // bg-gray-50
                    }}>
                      Text
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {popoutTableRows.map((row, index) => (
                    <tr key={index}>
                      <td style={{
                        padding: '0.5rem 0.75rem', // py-2 px-3
                        fontSize: '0.875rem', // text-sm
                        color: '#374151', // text-gray-700
                        wordBreak: 'break-word', // break-words
                        border: '1px solid #d1d5db' // border border-gray-300
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
        marginTop: '1.5rem', // mt-6
        color: '#4b5563', // text-gray-600
        textAlign: 'center',
        maxWidth: '48rem' // max-w-4xl (approximate)
      }}>
        This sunburst chart visualizes the hierarchy of Public Finance challenges and their associated policy commitments. Click on a segment to zoom in/out and view up to two layers at a time. Clicking the outermost layer segments will display a pop-out table with sample extracted text.
      </p>
    </div>
  );
};

export default App;
