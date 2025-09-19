const https = require('https');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { parseString } = require('xml2js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const SAP_USERNAME = process.env.SAP_USERNAME;
const SAP_PASSWORD = process.env.SAP_PASSWORD;
const SAP_CLIENT = process.env.SAP_CLIENT;

const SAP_LOGIN_URL = process.env.SAP_LOGIN_URL;
const SAP_PLANT_MAPPING_URL = process.env.SAP_PLANT_MAPPING_URL;
const SAP_NOTIFICATIONS_URL = process.env.SAP_NOTIFICATIONS_URL;
const SAP_PM_DETAILS_URL = process.env.SAP_PM_DETAILS_URL;
const SAP_WORK_ORDERS_URL = process.env.SAP_WORK_ORDERS_URL;

// 🔐 SAP Login Route
app.get('/api/maintenance/login/:employeeId', async (req, res) => {
  const employeeId = req.params.employeeId;

  // Updated API URL based on your Postman example
  const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/SAP/ZTHI_PM_ODATA_SRV/ZTHI_MAINT_LOGIN_ETSet(EmployeeId='${employeeId}')`;

  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'x-csrf-token': 'fetch',
        Cookie: `sap-usercontext=sap-client=${SAP_CLIENT}`
      }
    });

    parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse XML response' });

      try {
        // Navigate the XML structure to extract EmployeeId and Password
        const properties = result['entry']['content'][0]['m:properties'][0];
        const empId = properties['d:EmployeeId'][0];
        const password = properties['d:Password'][0];

        res.json({ employeeId: empId, password });
      } catch (e) {
        res.status(500).json({ error: 'Unexpected SAP response structure' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'SAP login request failed', details: error.message });
  }
});



// 🔁 Plant Mapping Route
app.get('/api/maintenance/plant-mapping/:engineerId', async (req, res) => {
  const engineerId = req.params.engineerId;

  // Updated URL based on your Postman details
  const url = `${SAP_PLANT_MAPPING_URL}?$filter=(MaintEngineer eq '${engineerId}')`;

  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'x-csrf-token': 'fetch',
        Cookie: `sap-usercontext=sap-client=${SAP_CLIENT}`
      }
    });

    parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse XML' });

      try {
        const entries = result['feed']['entry'] || [];
        const plants = entries.map(entry => {
          const props = entry['content'][0]['m:properties'][0];
          return {
            maintEngineer: props['d:MaintEngineer'][0],
            plantId: props['d:PlantId'][0]
          };
        });

        res.json({ engineerId, plants });
      } catch (e) {
        res.status(500).json({ error: 'Unexpected SAP feed structure' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'SAP plant mapping request failed', details: error.message });
  }
});

// 📋 Notifications Route
app.get('/api/maintenance/notifications/:plantId', async (req, res) => {
  const plantId = req.params.plantId;
  const url = `${SAP_NOTIFICATIONS_URL}?$filter=(Iwerk eq '${plantId}')`;
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'x-csrf-token': 'fetch',
        Cookie: `sap-usercontext=sap-client=${SAP_CLIENT}`
      }
    });

    parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse XML' });

      try {
        const entries = result.feed?.entry || [];
        const notifications = entries.map(entry => {
          const props = entry.content[0]['m:properties'][0];
          return {
            notificationNo: props['d:Qmnum']?.[0],
            date: props['d:Qmdat']?.[0]?.split('T')[0],
            type: props['d:Qmart']?.[0],
            description: props['d:Qmtxt']?.[0],
            priority: props['d:Priokx']?.[0] || 'N/A'
          };
        });

        res.json({ plantId, notifications });
      } catch (e) {
        res.status(500).json({ error: 'Unexpected SAP notifications structure' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'SAP notifications request failed', details: error.message });
  }
});


// 🧑‍🔧 PM Details Route
app.get('/api/maintenance/pm-details/:engineerId', async (req, res) => {
  const engineerId = req.params.engineerId;
  const url = `${SAP_PM_DETAILS_URL}?$filter=(MaintEngineer eq '${engineerId}')`;
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'x-csrf-token': 'fetch',
        Cookie: `sap-usercontext=sap-client=${SAP_CLIENT}`
      }
    });

    parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse XML' });

      try {
        const entries = result.feed?.entry || [];
        const pmDetails = entries.map(entry => {
          const props = entry.content[0]['m:properties'][0];
          return {
            plant: props['d:Plant']?.[0] || null,
            name: props['d:Name1']?.[0] || null,
            city: props['d:Ort01']?.[0] || null,
            region: props['d:Regio']?.[0] || null,
            country: props['d:Land1']?.[0] || null,
            engineerId: props['d:MaintEngineer']?.[0] || null
          };
        });

        res.json({ engineerId, pmDetails });
      } catch (e) {
        res.status(500).json({ error: 'Unexpected SAP PM details structure' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'SAP PM details request failed', details: error.message });
  }
});


// 🛠️ Work Orders Route
app.get('/api/maintenance/work-orders/:plantId', async (req, res) => {
  const plantId = req.params.plantId;
  const url = `${process.env.SAP_WORK_ORDERS_URL}?$filter=(Werks eq '${plantId}')`;
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.SAP_USERNAME}:${process.env.SAP_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'x-csrf-token': 'fetch',
        Cookie: `sap-usercontext=sap-client=${process.env.SAP_CLIENT}`
      }
    });

    parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse XML' });

      try {
        const entries = result?.feed?.entry || [];
        const workOrders = entries.map(entry => {
          const props = entry.content[0]['m:properties'][0];
          return {
            orderNumber: props['d:Aufnr']?.[0],
            description: props['d:Ktext']?.[0] || '',
            orderType: props['d:Auart']?.[0],
            startDate: props['d:Gstrs']?.[0]?.split('T')[0] || null,
            endDate: props['d:Gltrs']?.[0]?.split('T')[0] || null,
            equipmentNumber: props['d:Equnr']?.[0] || '',
            costCenter: props['d:Kostl']?.[0] || '',
            plant: props['d:Werks']?.[0] || '',
            companyCode: props['d:Bukrs']?.[0] || '',
            shortText: props['d:Txt04']?.[0] || '',
            longText: props['d:Txt30']?.[0] || ''
          };
        });

        res.json({ plantId, workOrders });
      } catch (e) {
        res.status(500).json({ error: 'Unexpected SAP work orders structure', details: e.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'SAP work orders request failed', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
