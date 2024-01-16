import { useState, useEffect } from "react";
import { ethers } from "ethers";
import QRCode from "qrcode.react";
import atm_abi from "../artifacts/contracts/Assessment.sol/Assessment.json";

export default function HomePage() {
  const [ethWallet, setEthWallet] = useState(undefined);
  const [account, setAccount] = useState(undefined);
  const [atm, setATM] = useState(undefined);
  const [balance, setBalance] = useState(undefined);
  const [depositAmount, setDepositAmount] = useState(1); // Default deposit amount
  const [withdrawalAmount, setWithdrawalAmount] = useState(1); // Default withdrawal amount
  const [receipts, setReceipts] = useState([]);

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const atmABI = atm_abi.abi;

  const getWallet = async () => {
    if (window.ethereum) {
      setEthWallet(window.ethereum);
    }

    if (ethWallet) {
      const accounts = await ethWallet.request({ method: "eth_accounts" });
      handleAccount(accounts);
    }
  };

  const handleAccount = (accounts) => {
    if (accounts.length > 0) {
      console.log("Account connected: ", accounts[0]);
      setAccount(accounts[0]);
    } else {
      console.log("No account found");
    }
  };

  const connectAccount = async () => {
    if (!ethWallet) {
      alert("MetaMask wallet is required to connect");
      return;
    }

    const accounts = await ethWallet.request({ method: "eth_requestAccounts" });
    handleAccount(accounts);

    // once the wallet is set, we can get a reference to our deployed contract
    getATMContract();
  };

  const getATMContract = () => {
    const provider = new ethers.providers.Web3Provider(ethWallet);
    const signer = provider.getSigner();
    const atmContract = new ethers.Contract(contractAddress, atmABI, signer);

    setATM(atmContract);
  };

  const getBalance = async () => {
    if (atm) {
      const currentBalance = (await atm.getBalance()).toNumber();
      setBalance(currentBalance);

      // Store the receipt for the transaction
      const receipt = {
        type: "Balance Update",
        transactionNumber: receipts.length + 1,
        owner: account,
        balance: currentBalance,
        amount: 0, // No actual transaction amount for balance updates
      };

      // Update the receipts array with the new receipt
      setReceipts((prevReceipts) => [...prevReceipts, receipt]);
    }
  };

  const performTransaction = async (isDeposit) => {
    if (atm) {
      const amount = isDeposit ? depositAmount : withdrawalAmount;
      try {
        let tx;

        if (isDeposit) {
          tx = await atm.deposit(amount);
        } else {
          tx = await atm.withdraw(amount);
        }

        await tx.wait();
        getBalance();
        updateLastThreeReceipts();
      } catch (error) {
        console.error("Error performing transaction:", error);
      }
    }
  };

  const multiplyFunds = async () => {
    if (atm) {
      try {
        await atm.multiplyFunds();
        getBalance();
        updateLastThreeReceipts();
      } catch (error) {
        console.error("Error multiplying funds:", error);
      }
    }
  };

  const updateLastThreeReceipts = () => {
    // Keep only the last three receipts
    setReceipts((prevReceipts) =>
      prevReceipts.length > 2 ? prevReceipts.slice(-3) : prevReceipts
    );
  };

  const initUser = () => {
    // Check to see if the user has Metamask
    if (!ethWallet) {
      return <p>Please install Metamask to use this ATM.</p>;
    }

    // Check to see if the user is connected. If not, connect to their account
    if (!account) {
      return (
        <button onClick={connectAccount}>
          Please connect your Metamask wallet
        </button>
      );
    }

    if (balance === undefined) {
      getBalance();
    }

    return (
      <div>
        <p>Your Account: {account}</p>
        <p>Your Balance: {balance}</p>
        <label>
          Deposit Amount:
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
          />
        </label>
        <button onClick={() => performTransaction(true)}>Deposit</button>
        <br />
        <label>
          Withdrawal Amount:
          <input
            type="number"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
          />
        </label>
        <button onClick={() => performTransaction(false)}>Withdraw</button>
        <br />
        <button onClick={multiplyFunds}>Multiply Funds by 5x</button>
        <div>
          <h2>Last Three Receipts</h2>
          {receipts.map((receipt, index) => (
            <div key={index}>
              <p>Type: {receipt.type}</p>
              <p>Transaction Number: {receipt.transactionNumber}</p>
              <p>Owner: {receipt.owner}</p>
              <p>Balance: {receipt.balance}</p>
              <p>Amount: {receipt.amount}</p>
              <hr />
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    getWallet();
  }, []);

  return (
    <main className="container">
      <header>
        <h1>Welcome to the Metacrafters ATM!</h1>
      </header>
      {initUser()}
      <div className="qrCode">
        <p>Scan QR code to view details</p>
        <QRCode value={JSON.stringify(receipts)} />
      </div>
      <style jsx>{`
        .container {
          text-align: center;
          background-color: purple;
          color: white;
          padding: 20px;
        }

        .qrCode {
          margin-top: 20px;
          text-align: center;
        }
      `}</style>
    </main>
  );
}
