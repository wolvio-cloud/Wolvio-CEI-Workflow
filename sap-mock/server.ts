import express from 'express'
import cors from 'cors'

const app = express()
const port = 3005

app.use(cors())
app.use(express.json())

// SAP S/4HANA OData v4 Mocks
app.get('/sap/opu/odata/v4/API_SALES_CONTRACT_SRV/A_SalesContract', (req, res) => {
  res.json({
    "@odata.context": "$metadata#A_SalesContract",
    "value": [
      {
        "SalesContract": "WFA-LTSA-2019-001",
        "SalesContractType": "LTSA",
        "Customer": "ReNew Sustainable Energy Private Limited",
        "ContractStartDate": "2019-04-01T00:00:00Z",
        "ContractEndDate": "2034-03-31T00:00:00Z",
        "TotalNetAmount": "144000000.00",
        "TransactionCurrency": "INR"
      }
    ]
  })
})

app.get("/sap/opu/odata/v4/API_SALES_CONTRACT_SRV/A_SalesContract('WFA-LTSA-2019-001')", (req, res) => {
  res.json({
    "@odata.context": "$metadata#A_SalesContract/$entity",
    "SalesContract": "WFA-LTSA-2019-001",
    "SalesContractType": "LTSA",
    "Customer": "ReNew Sustainable Energy Private Limited",
    "ContractStartDate": "2019-04-01T00:00:00Z",
    "ContractEndDate": "2034-03-31T00:00:00Z",
    "TotalNetAmount": "144000000.00",
    "TransactionCurrency": "INR"
  })
})

app.get('/sap/opu/odata/v4/API_BILLING_DOCUMENT_SRV/A_BillingDocument', (req, res) => {
  res.json({
    "@odata.context": "$metadata#A_BillingDocument",
    "value": [
      {
        "BillingDocument": "90001234",
        "BillingDocumentType": "F2",
        "SalesContract": "WFA-LTSA-2019-001",
        "BillingDocumentDate": "2025-03-05T00:00:00Z",
        "TotalNetAmount": "13344000.00",
        "TotalTaxAmount": "2401920.00",
        "TransactionCurrency": "INR"
      }
    ]
  })
})

app.post('/sap/opu/odata/v4/API_BILLING_DOCUMENT_SRV/A_BillingDocument', (req, res) => {
  res.status(201).json({
    "@odata.context": "$metadata#A_BillingDocument/$entity",
    "BillingDocument": "90005678",
    "Status": "Posted",
    "Message": "Invoice successfully posted to SAP S/4HANA Finance"
  })
})

app.get('/sap/opu/odata/v4/API_CUSTOMER_PAYMENT/A_CustomerPayment', (req, res) => {
  res.json({
    "@odata.context": "$metadata#A_CustomerPayment",
    "value": [
      {
        "PaymentDocument": "10004567",
        "BillingDocument": "90001234",
        "Customer": "ReNew",
        "Amount": "15745920.00",
        "PaymentDate": "2025-04-10T00:00:00Z"
      }
    ]
  })
})

app.listen(port, () => {
  console.log(`🚀 SAP S/4HANA OData Mock Server running at http://localhost:${port}`)
})
