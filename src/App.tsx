import React, { useEffect, useState } from "react";
import {
  OnchainService,
  ElectionInfo,
  CandidateDetails,
  ElectionWinner,
} from "./onchain/onchain";
import { PinataSDK } from "pinata";
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_GATEWAY_URL,
});

function App() {
  const onchainService = new OnchainService();

  let supraProvider: any =
    typeof window !== "undefined" && (window as any)?.starkey?.supra;

  const [isStarkeyInstalled, setIsStarkeyInstalled] = useState<boolean>(
    !!supraProvider
  );

  const [accounts, setAccounts] = useState<string[]>([]);
  const [networkData, setNetworkData] = useState<any>();

  const [createElection, setCreateElection] = useState("");
  const [startElection, setStartElection] = useState<number | null>(null);
  const [endElection, setEndElection] = useState<number | null>(null);

  const [electionInfo, setElectionInfo] = useState<ElectionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [electionCandidateInfo, setElectionCandidateInfo] = useState<
    CandidateDetails[]
  >([]);

  
  const [electionWinnerId, setElectionWinerId] = useState<ElectionWinner | null>(null);

  const [electionId, setElectionId] = useState<number | null>(null);

  const [candidateName, setCandidateName] = useState<string>("");
  const [candidateDAO, setCandidateDAO] = useState<string>("");



  const [regVoteElectionId, setRegVoteElectionId] = useState<number | null>( null);


  const [startElectionId, setStartElectionId] = useState<number | null>(null);
  const [startElectionDuration, setStartElectionDuration] = useState<number | null >(null);
  const [endElectionHandle, setEndElectionHandle] = useState<number | null>(null );


  // Transaction state
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<string>("");


  const checkForStarkey = () => {
    const intervalId = setInterval(() => {
      if ((window as any)?.starkey) {
        supraProvider = (window as any)?.starkey.supra;
        clearInterval(intervalId);
        setIsStarkeyInstalled(true);
        updateAccounts().then();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);
  };

  useEffect(() => {
    checkForStarkey();
  }, []);

  const getNetworkData = async () => {
    if (supraProvider) {
      const data = await supraProvider.getChainId();
      console.log(data);
      if (data) {
        setNetworkData(data);
      }
    }
  };

  const updateAccounts = async () => {
    if (supraProvider) {
      try {
        const response_acc = await supraProvider.account();
        if (response_acc.length > 0) {
          setAccounts(response_acc);
        } else {
          setAccounts([]);
        }
      } catch (e) {
        setAccounts([]);
      }
      getNetworkData().then();
    }
  };

  useEffect(() => {
    if (supraProvider) {
      supraProvider.on("accountChanged", (acc: string[]) => {
        setAccounts(acc);
      });
      supraProvider.on("networkChanged", (data: any) => {
        setNetworkData(data);
      });
      supraProvider.on("disconnect", () => {
        resetWalletData();
      });
    }
  }, [supraProvider]);

  useEffect(() => {
    if (accounts) {
      getNetworkData().then();
    }
  }, [accounts]);

  const resetWalletData = () => {
    setAccounts([]);
    setNetworkData({});
  };

  const connectWallet = async () => {
    const response = await supraProvider.connect();
    updateAccounts().then();
  };

  const disconnectWallet = async () => {
    if (supraProvider) {
      await supraProvider.disconnect();
    }
    resetWalletData();
  };

  const switchToTestnet = async () => {
    if (supraProvider) {
      await supraProvider.changeNetwork({ chainId: "6" });
      await getNetworkData();
    }
  };

  const switchToMainnet = async () => {
    if (supraProvider) {
      await supraProvider.changeNetwork({ chainId: "8" });
      await getNetworkData();
    }
  };

  // Fetch election info
  useEffect(() => {
    const fetchElectionInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await onchainService.getElectionInfo(7);

        console.log("Election Info:", result);
        setElectionInfo(result);
      } catch (err) {
        console.error("Error fetching election info:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch election info"
        );
        setElectionInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchElectionInfo();
  }, []);

  // Fetch election Winner
  useEffect(() => {
    const fetchElectionInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await onchainService.getWinner_Id(1);

        console.log("Election WINNER:", result);
        setElectionWinerId(result);
      } catch (err) {
        console.error("Error fetching election info:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch election info"
        );
        setElectionWinerId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchElectionInfo();
  }, []);

  // Fetch election candidates info 
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await onchainService.getAllCandidates(1);

        console.log("Candidates:", result);
        setElectionCandidateInfo(result); // Use candidates state instead of electionInfo
      } catch (err) {
        console.error("Error fetching candidates:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch candidates"
        );
        setElectionCandidateInfo([]); // Set empty array for candidates
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);
//CREATE ELECTION

  const handleCreateElection = async () => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    // Add validation
    if (!createElection.trim()) {
      alert("Please enter an election name");
      return;
    }

    if (
      startElection !== null &&
      endElection !== null &&
      startElection >= endElection
    ) {
      alert("End time must be after start time");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Creating election...");

      const txHash = await onchainService.createElection(
        createElection, 
        startElection, 
        endElection 
      );

      // Reset form
      setCreateElection("");
      setStartElection(null);
      setEndElection(null);
      setTxStatus(`${txHash}`);
      console.log("Election created:", txHash);

    } catch (error) {
      console.error("Error creating election:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };

  //IPFS IMAGE UPLOADER TO PINATA

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [link, setLink] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadStatus("Getting upload URL...");
      const urlResponse = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/presigned_url`,
        {
          method: "GET",
          headers: {
            // Handle your own server authorization here
          },
        }
      );
      const data = await urlResponse.json();

      setUploadStatus("Uploading file...");

      const upload = await pinata.upload.public.file(file).url(data.url);

      if (upload.cid) {
        setUploadStatus("File uploaded successfully!");
        const ipfsLink = await pinata.gateways.public.convert(upload.cid);
        setLink(ipfsLink);
      } else {
        setUploadStatus("Upload failed");
      }
    } catch (error) {
      setUploadStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // REGISTER CANDIDATE

  const handleRegisterCandidate = async () => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Registering as candidate...");

      const txHash = await onchainService.registerCandidate(
        `${candidateName}`, // candidate name
        `${candidateDAO}`, // DAO
        `${link}`, // Candidate IMAGE IPFS LINK
        electionId ?? 0 // election ID
      );
      setLink("");
      setElectionId(null);
      setCandidateName("");
      setCandidateDAO("");

      setTxStatus(`${txHash}`);
      console.log("Candidate registered:", txHash);
    } catch (error) {
      console.error("Error registering candidate:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };
  

  // Register Voter

  const handleRegisterVoter = async () => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Registering as voter...");

      const txHash = await onchainService.registerVoter(
        regVoteElectionId ?? 0 // election ID
      );

      setRegVoteElectionId(null);

      setTxStatus(`${txHash}`);
      console.log("Voter registered:", txHash);
    } catch (error) {
      console.error("Error registering voter:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };


  //Vote
  const handleVote = async (
    candidateElectionId: number,
  ) => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Casting vote...");

      const txHash = await onchainService.vote(
        1, // election ID
        candidateElectionId // election ID
      );

      setTxStatus(`${txHash}`);
      console.log("Vote cast:", txHash);

 
    } catch (error) {
      console.error("Error voting:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };

  // Start ELECTION
  const handleStartElection = async () => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Starting election...");

      const txHash = await onchainService.startElection(
        startElectionId ?? 0,
        startElectionDuration ?? 0
      );

      setTxStatus(`${txHash}`);
      console.log("Election started:", txHash);
  
    } catch (error) {
      console.error("Error starting election:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };
  const handlEndElection = async () => {
    if (accounts.length === 0) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setTxLoading(true);
      setTxStatus("Starting election...");

      const txHash = await onchainService.endElection(endElectionHandle ?? 0);

      setTxStatus(`${txHash}`);
      console.log("Election started:", txHash);

 
    } catch (error) {
      console.error("Error starting election:", error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTxLoading(false);
    }
  };

  // Render logic with proper type checking
  if (loading) {
    return <div>Loading election information...</div>;
  }

  console.log("Rendering with electionInfo:", electionInfo);
  //  const dataProcessor = conversionUtils.deserializeOptionU64(electionInfo.start_time as Uint8Array);
  function formatTimestamp(seconds: number): string {
    if (!seconds) return "N/A";
    return new Date(seconds * 1000).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="h-full w-full p-4 gap-7 bg-gradient-to-tr from-indigo-600  to-purple-500 space-y-5 flex flex-col  items-center">
      <div className="flex w-full  h-30 rounded-md text-white bg-gradient-to-tr from-indigo-400 via-pink-400 to-purple-400 p-4 justify-between  items-center">
        <h1 className="text-4xl font-bold">Voting DApp</h1>

        {/* <p>
          <strong>Connected Account(s):</strong> {JSON.stringify(accounts[0])}
        </p> */}
       

        <div >
           <p className="p-5 bg-transparent  ">
        Network :  {networkData?.chainId === "8" ? "Mainnet" : "Testnet"}
        </p>
          <button className="btn" onClick={switchToTestnet}>Switch to Testnet</button>
          <button className="btn" onClick={switchToMainnet} style={{ marginLeft: "10px" }}>
            Switch to Mainnet
          </button>
        </div>
      </div>

     
        <h2 className="text-4xl  font-extrabold md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r to-indigo-800 from-violet-800">
          Secure Blockchain Voting Platform
        </h2>
      

      <div className="text-white text-3xl font-bold">
        <button
          className="btn"
          onClick={connectWallet}
          disabled={accounts.length > 0}
        >
          {accounts.length > 0 ? "Wallet Connected" : "Connect Wallet"}
        </button>

        <button
          onClick={disconnectWallet}
          disabled={accounts.length === 0}
          style={{ marginLeft: "10px" }}
          className="btn"
        >
          Disconnect Wallet
        </button>
      </div>

      <h2 className="text-white text-3xl font-bold">Election Information</h2>
      <div className="w-1/2 h-48   rounded-md bg-gradient-to-tr from-indigo-600 via-pink-600 to-purple-600 p-0.5">
        {error && <div style={{ color: "red" }}>Error: {error}</div>}
        {electionInfo ? (
          <div className="text-white  text-3xl p-4 flex gap-14 justify-center">
            <p className="">
              <strong>Election:</strong> {electionInfo.election_name || "No name"}
            </p>
            <p>
              <strong>Active:</strong> {electionInfo.is_active ? "Yes" : "No"}
            </p>
            <p>
              <strong>Total Votes:</strong> {electionInfo.total_votes}
            </p>
          </div>
        ) : (
          <div>No election information available</div>
        )}
        {/* <button
          onClick={() => window.location.reload()}
          style={{ marginTop: "10px" }}
        >
          Refresh Election Data
        </button> */}
      </div>

      {/* Transaction Section */}
      <div className="w-full h-full rounded-md text-white bg-gradient-to-tr from-indigo-600 via-pink-600 to-purple-600 p-4 space-y-5 ">
        <div className=" ">
          <h2 className="text-center text-2xl font-bold">
            Election Candidates
          </h2>
          <div className="text-center text-xl font-bold p-5">
            Winner ID : {electionWinnerId?.winner_id ?? "N/A"}
          </div>

          <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 ">
            {electionCandidateInfo.map((candidate) => (
              <div
                key={candidate.candidate_id}
                className="relative text-white  border-solid border-gray-200 rounded-2xl p-4 shadow-2xl border-2  transition-all duration-500 hover:bg-grey-600 "
              >
                {electionWinnerId?.winner_id === candidate.candidate_id && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold">
                    Winner
                  </div>
                )}
                <div className="flex items-center gap-5">
                  <img
                    src={candidate.image}
                    alt={candidate.name}
                    className="w-48 h-48 object-fit rounded-full "
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-avatar.png"; // Fallback image
                    }}
                  />
                  <button className="btn"
                     
                    onClick={() => handleVote(candidate.candidate_id)}
                  > Vote Candidate </button>
                </div>
                <div className="p-4 text-white">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold   mb-2">
                      Name: {candidate.name}
                    </h3>
                    <p className="text-sm ">
                      <span className="font-semibold">ID:</span>{" "}
                      {candidate.candidate_id}
                    </p>
                    <p className="text-sm ">
                      <span className="font-semibold">DAO:</span>{" "}
                      {candidate.dao}
                    </p>
                    <p className="text-sm ">
                      <span className="font-semibold">Votes:</span>
                      <span className="ml-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {candidate.votes}
                      </span>
                    </p>
                    <p className="text-xs  break-all">
                      <span className="font-semibold">Address:</span>
                      <br />
                      {candidate.candidate_address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {txStatus && (
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              backgroundColor: txStatus.includes("Error")
                ? "#ffebee"
                : "#e8f5e8",
              color: txStatus.includes("Error") ? "#d32f2f" : "#2e7d32",
              borderRadius: "4px",
            }}
          >
            <a
            href={`https://testnet.suprascan.io/tx/${txStatus}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-2xl font-bold text-green-500 ml-5 mr-5"
          >
           Scan :
          </a>
           {txStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2 card">
            <button
              onClick={handleCreateElection}
              disabled={txLoading || accounts.length === 0}
              className="btn-primary"
            >
              {txLoading ? "Processing..." : "Create Election"}
            </button>
            <input
              value={createElection} // ...force the input's value to match the state variable...
              onChange={(e) => setCreateElection(e.target.value)} // ... and update the state variable on any edits!
              className="input"
              placeholder="Election Name"
            />
            <input
              type="number"
              value={startElection ?? ""}
              className="input "
              onChange={(e) => {
                const num =
                  e.target.value === "" ? null : Number(e.target.value);

                setStartElection(num);
              }}
              placeholder="Start Time"
            />
            <input
              type="number"
              value={endElection ?? ""}
              className="input "
              onChange={(e) => {
                const num =
                  e.target.value === "" ? null : Number(e.target.value);
                setEndElection(num);
              }}
              placeholder="End Time"
            />
          </div>

          <div className="flex flex-col gap-2 p-5 card">
            <button
              onClick={handleRegisterCandidate}
              disabled={txLoading || accounts.length === 0}
              className="btn-primary"
            >
              {txLoading ? "Processing..." : "Register as Candidate"}
            </button>

            <div className=" flex flex-col gap-2 justify-center items-center">
              <h2 className="font-mono">Upload candidate Image </h2>
              <input
                type="file"
                onChange={handleFileChange}
                className="flex w-1/2 h-12 p-5 flex-col bg-indigo-600 rounded-full shadow text-white text-sm font-semibold leading-4 items-center justify-center cursor-pointer focus:outline-none"
              />
              <button onClick={handleUpload} disabled={!file} className="btn">
                Upload to Pinata
              </button>
              {uploadStatus && <p>{uploadStatus}</p>}
              {link && (
                <a href={link} target="_blank">
                  View File
                </a>
              )}
            </div>

            <input
              type="number"
              className="input "
              value={electionId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setElectionId(value === "" ? null : Number(value));
              }}
              placeholder="Election ID"
            />
            <input
              value={candidateName} // ...force the input's value to match the state variable...
              onChange={(e) => setCandidateName(e.target.value)} // ... and update the state variable on any edits!
              className="input "
              placeholder="Candidate Name"
            />
            <input
              value={candidateDAO} // ...force the input's value to match the state variable...
              onChange={(e) => setCandidateDAO(e.target.value)} // ... and update the state variable on any edits!
              className="input "
              placeholder="Candidate DAO"
            />
          </div>

          <div className="flex flex-col gap-2 card">
            <button
              onClick={handleRegisterVoter}
              disabled={txLoading || accounts.length === 0}
              className="btn-primary"
            >
              {txLoading ? "Processing..." : "Register as Voter"}
            </button>
            <input
              type="number"
              className="input "
              value={regVoteElectionId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setRegVoteElectionId(value === "" ? null : Number(value));
              }}
              placeholder="Election ID"
            />
          </div>


          <div className="flex flex-col gap-2 card">
            <button
              onClick={handleStartElection}
              disabled={txLoading || accounts.length === 0}
              className="btn-primary"
            >
              {txLoading ? "Processing..." : "Start Election"}
            </button>
            <input
              type="number"
              value={startElectionId ?? ""}
              className="input "
              onChange={(e) => {
                const value = e.target.value;
                setStartElectionId(value === "" ? null : Number(value));
              }}
              placeholder="Election ID"
            />
            <input
              type="number"
              value={startElectionDuration ?? ""}
              className="input "
              onChange={(e) => {
                const value = e.target.value;
                setStartElectionDuration(value === "" ? null : Number(value));
              }}
              placeholder="Election duration"
            />
          </div>

          <div className="flex flex-col gap-2 card">
            <button
              onClick={handlEndElection}
              disabled={txLoading || accounts.length === 0}
              className="btn-primary"
            >
              {txLoading ? "Processing..." : "End Election"}
            </button>
            <input
              type="number"
              value={endElectionHandle ?? ""}
              className="input "
              onChange={(e) => {
                const value = e.target.value;
                setEndElectionHandle(value === "" ? null : Number(value));
              }}
              placeholder="Election ID"
            />
          </div>
        </div>

        {accounts.length === 0 && (
          <p style={{ color: "#666", fontStyle: "italic", marginTop: "10px" }}>
            Please connect your wallet to perform transactions
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
