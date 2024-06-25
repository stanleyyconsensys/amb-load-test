const axios = require('axios').default;
const SHA256 = require('@aws-crypto/sha256-js').Sha256
const defaultProvider = require('@aws-sdk/credential-provider-node').defaultProvider
const HttpRequest = require('@aws-sdk/protocol-http').HttpRequest
const SignatureV4 = require('@aws-sdk/signature-v4').SignatureV4
const Bitcoin = require("bitcoinjs-lib");  
const dotenv = require("dotenv");  
dotenv.config()

const queryRequest = async (path, data) => {
    const signer = new SignatureV4({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET
        },
          service: 'managedblockchain-query',
          region: process.env.AWS_REGION,
          sha256: SHA256,
        });

  //query endpoint
  let queryEndpoint = `https://managedblockchain-query.${process.env.AWS_REGION}.amazonaws.com/${path}`;
  
  // parse the URL into its component parts (e.g. host, path)
  const url = new URL(queryEndpoint);
  
  // create an HTTP Request object
  const req = new HttpRequest({
    hostname: url.hostname.toString(),
    path: url.pathname.toString(),
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
      host: url.hostname,
    }
  });

  
  // use AWS SignatureV4 utility to sign the request, extract headers and body
  const signedRequest = await signer.sign(req, { signingDate: new Date() });
  
  try {
    //make the request using axios
    const response = await axios({...signedRequest, url: queryEndpoint, data: data})

    return response.data
  } catch (error) {
    console.error('Something went wrong: ', error)
    throw error
  } 

 
}

const rpcRequest = async ( data) => {
    const signer = new SignatureV4({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET
      },
        service: 'managedblockchain-query',
        region: process.env.AWS_REGION,
        sha256: SHA256,
      });
    //query endpoint
    let queryEndpoint = `https://testnet.bitcoin.managedblockchain.${process.env.AWS_REGION}.amazonaws.com`;
    
    // parse the URL into its component parts (e.g. host, path)
    const url = new URL(queryEndpoint);
    
    // create an HTTP Request object
    const req = new HttpRequest({
      hostname: url.hostname.toString(),
      path: url.pathname.toString(),
      body: JSON.stringify(data),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        host: url.hostname,
      }
    });
  
    
    // use AWS SignatureV4 utility to sign the request, extract headers and body
    const signedRequest = await signer.sign(req, { signingDate: new Date() });
    
    try {
      //make the request using axios
      const response = await axios({...signedRequest, url: queryEndpoint, data: data})
  
      return response.data
    } catch (error) {
      console.error('Something went wrong: ')
      throw error
    } 
  
   
  }

const listTransactions = async() => {
    const start = new Date().getTime();
    console.log('start', start)
    let methodArg = 'list-filtered-transaction-events';

    let dataArg = {
    "addressIdentifierFilter": {
      "transactionEventToAddress" : ["tb1pyl9jyn04gx34zuzw0qu3k7pxlxc0xxgkhjspqa2rucc2mvx2zaqse4mnl6"],
    },  
    "voutFilter": {
      "voutSpent": false
    },
    "network":"BITCOIN_TESTNET",
    }

    const data = await queryRequest(methodArg, dataArg);
    let total = 0
    data.events.forEach((event) => {
      total += parseFloat(event.value)
    })
    console.log('transaction count', data.events.length)  
    console.log('transaction sum', total)  
    await Promise.all(data.transactions.map((transaction) => 
        getTransaction(transaction.transactionId)
    ))
    const end = new Date().getTime();
    console.log('end', end)
    console.log('diff', end-start)
}

const getTransaction = async(txid) => {

    const hexstr = await rpcRequest({"jsonrpc": "1.0", "id": "curltest", "method": "getrawtransaction", "params": [txid]})
    const txBytes = Buffer.from(hexstr.result, "hex");  
  
    // Parse the transaction byte array  
    const tx = Bitcoin.Transaction.fromBuffer(txBytes);  
    console.log(tx.ins[0].script)
    const data = await rpcRequest({"jsonrpc": "1.0", "id": "curltest", "method": "decoderawtransaction", "params": [hexstr.result]})
    console.log(data.result.vin[0].txinwitness)
}

listTransactions()
//Run the query request.


