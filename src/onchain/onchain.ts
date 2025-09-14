import { SupraClient, SupraAccount, BCS, HexString } from "supra-l1-sdk";
import { VOTING_CONFIG } from "./onchain_config";
import useConversionUtils from "./useConversionUtils";
// Define types for better type safety
export interface ElectionInfo {
  election_name: string;
  is_active: boolean;
  start_time: number;
  end_time: number;
  total_votes: number;
}

// Type definition for CandidateDetails (add this to your types file)
export interface CandidateDetails {
  candidate_id: number;
  name: string;
  candidate_address: string;
  dao: string;
  image: string;
  votes: number;
}

export interface CandidateInfo {
  name: string;
  vote_count: number;
  candidate_address: string;
  dao: string;
}

export interface VoterInfo {
  voter_address: string;
  has_voted: boolean;
}
export interface ElectionWinner {
  winner_id: number;
}

export class OnchainService {
  private client: SupraClient;

  constructor() {
    this.client = new SupraClient(VOTING_CONFIG.NODE_URL);
  }
  conversionUtils = useConversionUtils();

  // Get the Starkey provider
  private getStarkeyProvider() {
    if (typeof window !== "undefined" && (window as any)?.starkey?.supra) {
      return (window as any).starkey.supra;
    }
    throw new Error(
      "Starkey wallet not found. Please install and connect Starkey wallet."
    );
  }

  // Helper function to create transaction payload
  private createTransactionPayload(
    functionName: string,
    typeArguments: string[] = [],
    args: any[] = []
  ) {
    return {
      function: `${VOTING_CONFIG.CONTRACT_ADDRESS}::${VOTING_CONFIG.MODULE_NAME}::${functionName}`,
      type_arguments: typeArguments,
      arguments: args,
    };
  }

  // Helper function to send transaction via Starkey
  private async sendTransactionViaStarkey(
    functionName: string,
    args: any[] = [],
    typeArguments: string[] = []
  ): Promise<string> {
    const provider = this.getStarkeyProvider();

    // Get connected account
    const accounts = await provider.account();
    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts connected");
    }

    const txExpiryTime = Math.ceil(Date.now() / 1000) + 30; // 30 seconds
    const optionalTransactionPayloadArgs = { txExpiryTime };

    const rawTxPayload = [
      accounts[0], // sender
      0, // sequence number (will be filled by provider)
      VOTING_CONFIG.CONTRACT_ADDRESS,
      VOTING_CONFIG.MODULE_NAME,
      functionName,
      typeArguments,
      args,
      optionalTransactionPayloadArgs,
    ];

    const data = await provider.createRawTransactionData(rawTxPayload);
    if (!data) {
      throw new Error("Failed to create transaction data");
    }

    const params = { data };
    const txHash = await provider.sendTransaction(params);
    return txHash;
  }

  async createElection(
    electionName: string,
    startTime: number | null,
    endTime: number | null
  ): Promise<string> {
    try {
      const args = [
        BCS.bcsSerializeStr(electionName),
        this.conversionUtils.serializeOptionU64(startTime ?? undefined),
        this.conversionUtils.serializeOptionU64(endTime ?? undefined),
      ];

      return await this.sendTransactionViaStarkey("create_election", args);
    } catch (error) {
      console.error("Error creating election:", error);
      throw error;
    }
  }

  // Register as a candidate
  async registerCandidate(
    candidateName: string,
    dao: string,
    link: string,
    electionId: number
  ): Promise<string> {
    try {
      const args = [
        BCS.bcsSerializeStr(candidateName),
        BCS.bcsSerializeStr(dao),
        BCS.bcsSerializeStr(link),
        BCS.bcsSerializeUint64(electionId),
      ];

      return await this.sendTransactionViaStarkey("register_candidate", args);
    } catch (error) {
      console.error("Error registering candidate:", error);
      throw error;
    }
  }

  // Register as a voter
  async registerVoter(electionId: number): Promise<string> {
    try {
      const args = [BCS.bcsSerializeUint64(electionId)];

      return await this.sendTransactionViaStarkey("register_voter", args);
    } catch (error) {
      console.error("Error registering voter:", error);
      throw error;
    }
  }

  // Cast a vote
  async vote(electionId: number, candidateId: number): Promise<string> {
    try {
      const args = [
        BCS.bcsSerializeUint64(electionId),
        BCS.bcsSerializeUint64(candidateId),
      ];

      return await this.sendTransactionViaStarkey("vote", args);
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  }

  // Start an election
  async startElection(
    electionId: number,
    durationSeconds: number
  ): Promise<string> {
    try {
      const args = [
        BCS.bcsSerializeUint64(electionId),
        BCS.bcsSerializeUint64(durationSeconds),
      ];

      return await this.sendTransactionViaStarkey("start_election", args);
    } catch (error) {
      console.error("Error starting election:", error);
      throw error;
    }
  }

  // End an election
  async endElection(electionId: number): Promise<string> {
    try {
      const args = [BCS.bcsSerializeUint64(electionId)];

      return await this.sendTransactionViaStarkey("end_election", args);
    } catch (error) {
      console.error("Error ending election:", error);
      throw error;
    }
  }

  // Get election information (View function - uses SupraClient)
  async getElectionInfo(election_id: number): Promise<ElectionInfo> {
    try {
      const payload = {
        function: `${VOTING_CONFIG.CONTRACT_ADDRESS}::${VOTING_CONFIG.MODULE_NAME}::get_election_info`,
        type_arguments: [],
        arguments: [election_id.toString()],
      };

      const result = await this.client.invokeViewMethod(
        payload.function,
        payload.type_arguments,
        payload.arguments
      );
      console.log("TEST Raw result from contract:", result);

      // Parse the result based on the Move function return type
      // (string::String, bool, option::Option<u64>, option::Option<u64>, u64)
      return {
        election_name: result[0] as string,
        is_active: result[1] as boolean,
        start_time:
          (result[2]?.vec?.length ?? 0) > 0 ? parseInt(result[2].vec[0]) : 0,
        end_time:
          (result[3]?.vec?.length ?? 0) > 0 ? parseInt(result[3].vec[0]) : 0,
        total_votes: parseInt(result[4] as string),
      };
    } catch (error) {
      console.error("Error getting election info:", error);
      // Return default info instead of throwing error for better UX
      return {
        election_name: "",
        is_active: false,
        start_time: 0,
        end_time: 0,
        total_votes: 0,
      };
    }
  }
  async getWinner_Id(election_id: number): Promise<ElectionWinner> {
    try {
      const payload = {
        function: `${VOTING_CONFIG.CONTRACT_ADDRESS}::${VOTING_CONFIG.MODULE_NAME}::get_winner`,
        type_arguments: [],
        arguments: [election_id.toString()],
      };

      const result = await this.client.invokeViewMethod(
        payload.function,
        payload.type_arguments,
        payload.arguments
      );
      console.log("Election winner", result);

      // Parse the result based on the Move function return type
      // (string::String, bool, option::Option<u64>, option::Option<u64>, u64)
      return {
        winner_id:
          (result[0]?.vec?.length ?? 0) > 0 ? parseInt(result[0].vec[0]) : 0,
      };
    } catch (error) {
      console.error("Error getting election info:", error);
      // Return default info instead of throwing error for better UX
      return {
        winner_id: 0,
      };
    }
  }

  async getAllCandidates(election_id: number): Promise<CandidateDetails[]> {
    try {
      const payload = {
        function: `${VOTING_CONFIG.CONTRACT_ADDRESS}::${VOTING_CONFIG.MODULE_NAME}::get_all_candidates`,
        type_arguments: [],
        arguments: [election_id.toString()],
      };

      const result = await this.client.invokeViewMethod(
        payload.function,
        payload.type_arguments,
        payload.arguments
      );

      console.log("Raw result from contract:", result);

      // The result is a nested array: [[{candidate1}, {candidate2}, ...]]
      // We need to flatten it to get the actual candidates
      if (!Array.isArray(result) || result.length === 0) {
        console.log("No candidates found or invalid result structure");
        return [];
      }

      // Extract candidates from the nested array structure
      const candidatesArray = result[0]; // Get the first (and likely only) inner array

      if (!Array.isArray(candidatesArray)) {
        console.error(
          "Expected nested array structure, got:",
          typeof candidatesArray
        );
        return [];
      }

      const candidates: CandidateDetails[] = candidatesArray.map(
        (candidate: any) => ({
          candidate_id: parseInt(candidate.candidate_id),
          name: candidate.name as string,
          candidate_address: candidate.candidate_address as string,
          dao: candidate.dao as string,
          image: candidate.image as string,
          votes: parseInt(candidate.votes),
        })
      );

      console.log("Parsed candidates:", candidates);
      return candidates;
    } catch (error) {
      console.error("Error getting all candidates:", error);
      return [];
    }
  }

  // Get candidate vote count (View function - uses SupraClient)
  async getCandidateVotes(
    electionOwnerAddress: string,
    electionId: number,
    candidateAddress: string
  ): Promise<number> {
    try {
      const payload = this.createTransactionPayload(
        "get_candidate_votes",
        [],
        [electionOwnerAddress, electionId.toString(), candidateAddress]
      );

      const result = await this.client.invokeViewMethod(
        payload.function,
        payload.type_arguments,
        payload.arguments
      );

      return parseInt(result[0] as string);
    } catch (error) {
      console.error("Error getting candidate votes:", error);
      return 0;
    }
  }

  // Check if voter has voted (View function - uses SupraClient)
  async hasVoterVoted(
    electionOwnerAddress: string,
    electionId: number,
    voterAddress: string
  ): Promise<boolean> {
    try {
      const payload = this.createTransactionPayload(
        "has_voter_voted",
        [],
        [electionOwnerAddress, electionId.toString(), voterAddress]
      );

      const result = await this.client.invokeViewMethod(
        payload.function,
        payload.type_arguments,
        payload.arguments
      );

      return result[0] as boolean;
    } catch (error) {
      console.error("Error checking voter status:", error);
      return false;
    }
  }

  // Check if wallet is connected
  async isWalletConnected(): Promise<boolean> {
    try {
      const provider = this.getStarkeyProvider();
      const accounts = await provider.account();
      return accounts && accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Get connected wallet address
  async getConnectedAddress(): Promise<string | null> {
    try {
      const provider = this.getStarkeyProvider();
      const accounts = await provider.account();
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      return null;
    }
  }
}
