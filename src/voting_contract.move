module election_board::voting_contract {
    use std::signer;
    use std::string;
    use std::option;
    use std::vector;
    use aptos_std::table::{Self,Table};
    use supra_framework::timestamp;
    use supra_framework::event;

    struct ElectionManager has key {
        total_created_elections: u16,
        elections: Table<u64,Election>,
        active_election: u64,
        ended_elections:u64
    }
    struct Election has store {
        candidates: Table<u64,Candidate>,
        candidate_count: u64,
        registered_candidate: vector<address>,
        total_votes: u64,
        registered_voters: Table <address, Voter>,
        is_active: bool,
        election_name :string::String,
        start_time: option::Option<u64>,
        end_time: option::Option<u64>,
        election_owner: address,
        winner_id: option::Option<u64>

    }

    struct Candidate has drop, store {
        name: string::String,
        candidate_id: u64,
        candidate_address: address,
        dao: string::String,
        image: string::String,
        votes: u64
    }

    struct Voter has drop, store {
        voter_address: address,
        has_voted: bool
    }
    struct CandidateDetails has store, drop{
        candidate_id: u64,
        name: string::String,
        candidate_address: address,
        dao: string::String,
        image: string::String,
        votes: u64
    }

    #[event]
    struct ElectionCreatedEvent has drop, store{
        election_id: u64,
        election_name: string::String,
        election_owner: address

    }
    #[event]
    struct CandidateRegEvent has drop,store {
        name: string::String,
        candidate_address: address,
        candidate_id: u64,
        dao: string::String

    }
    #[event]
    struct VoterRegEvent has drop,store {
        voter_address: address,
        has_voted: bool

    }
    #[event]
    struct VoteEvent has drop,store {
        voter_address: address,
        candidate_id: u64,
        election_id : u64
    }
    
    const E_ALREADY_REGISTERED: u64 = 1;
    const E_INVALID_OWNER: u64 = 2;
    const E_ENDTIME_ALREADY_STARTED: u64 = 3;
    const E_VOTER_NOT_REGISTERED: u64 = 4;
    const E_ALREADY_VOTED: u64 = 5;
    const E_ELECTION_NOT_ACTIVE: u64 = 6;
    const E_ELECTION_ENDED: u64 = 7;
    const E_ELECTION_NOT_STARTED: u64 = 8;
    const E_ALREADY_REGISTERED_VOTER: u64 = 9;

    const E_INVALID_CANDIDATE: u64 = 10;
    const E_ALREADY_INITIALIZED: u64 = 11;
    const E_NOT_INITIALIZED: u64 = 12;
    const E_ELECTION_NOT_FOUND: u64 = 13;
    const E_INVALID_START_TIME: u64 = 100;
    const E_INVALID_END_TIME: u64 = 101;
    const E_END_BEFORE_START: u64 = 102; 
    const E_ALREADY_REGISTERED_CANDIDATE: u64 = 14;
    const E_ELECTION_HASWINNER: u64 = 103;

    public entry fun initialize (admin: &signer){
        let admin_addr = signer::address_of(admin);
        assert!(!exists<ElectionManager>(admin_addr), E_ALREADY_INITIALIZED);
        move_to(admin,ElectionManager{
            total_created_elections: 0,
            elections: table::new(),
            active_election: 0,
            ended_elections:  0
        });
    }

    public entry fun create_election (
        election_owner: &signer,
        election_name: string::String,
        start_time: option::Option<u64>,
        end_time: option::Option<u64>

    ) acquires ElectionManager{
        let owners_address = signer::address_of(election_owner);
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
         
         let election_manager = borrow_global_mut<ElectionManager>(@election_board);
         let election_id = (election_manager.total_created_elections as u64);
          
        let processed_start_time = if (option::is_some(&start_time)){
            let start = *option::borrow(&start_time);
            let current_time = timestamp::now_seconds();
            let main_start = start + current_time;
            assert! (main_start >= current_time,E_INVALID_START_TIME);
            option::some(main_start)
        } else {
            option::none<u64>()
        };
        let processed_end_time = if (option::is_some(&end_time) && option::is_some(&start_time) ){
            let end_duration = *option::borrow(&end_time);
            let main_start = *option::borrow(&processed_start_time);
            let main_end = main_start + end_duration;

            assert!(main_end > main_start, E_END_BEFORE_START );
            option::some(main_end)
           
        } else {
            option::none<u64>()
        };
        
        let current_time = timestamp::now_seconds();
         let is_active = if (option::is_some(&processed_start_time ) && option::is_some(&processed_end_time)){
            let start = *option::borrow(&processed_start_time);
            let end = *option::borrow(&processed_end_time);
            current_time >= start && current_time <= end

         } else if (option::is_none(&processed_start_time ) && option::is_none(&processed_end_time)){

            false
         } else {

            false
         };

         let election = Election {
            candidates : table::new(),
            total_votes: 0,
            candidate_count: 0,
            registered_voters: table::new(),
            is_active,
            registered_candidate: vector::empty<address>(),
            election_name,
            start_time: processed_start_time,
            end_time: processed_end_time,
            election_owner: owners_address,
            winner_id: option::none<u64>()
         };

         table::add(&mut election_manager.elections, election_id, election);
         election_manager.total_created_elections = election_manager.total_created_elections + 1;

         event::emit(ElectionCreatedEvent{
            election_id,
            election_name,
            election_owner: owners_address
         });




    }

    public entry fun register_candidate(
        candidate_address: &signer,
        name: string::String,
        dao: string::String,
        image: string::String,
        election_id: u64
    ) acquires ElectionManager{
        let candidate_addr = signer::address_of(candidate_address);

        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global_mut<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow_mut(&mut election_manager.elections, election_id);
        assert!(option::is_none(&election.winner_id),E_ELECTION_HASWINNER);
        assert!(!vector::contains(&election.registered_candidate, &candidate_addr),E_ALREADY_REGISTERED_CANDIDATE);
        election.candidate_count = election.candidate_count + 1;
        let candidate_id = election.candidate_count;
        vector::push_back(&mut election.registered_candidate, candidate_addr);
        let candidate = Candidate {
            name,
            candidate_id,
            candidate_address: candidate_addr,
            dao,
            image,
            votes: 0
        };
        table::add(&mut election.candidates, candidate_id,candidate);

        event::emit( CandidateRegEvent{
            name,
            candidate_id,
            candidate_address: candidate_addr,
            dao
        })




    }

    public entry fun register_voter(
        voter_address: &signer,
        election_id:u64
    ) acquires ElectionManager {
        let voter_addr = signer::address_of(voter_address);
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global_mut<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow_mut(&mut election_manager.elections, election_id);
        assert!(option::is_none(&election.winner_id), E_ELECTION_HASWINNER);
        assert!(!table::contains(&election.registered_voters, voter_addr), E_ALREADY_REGISTERED_VOTER);
        let voter = Voter{
            voter_address: voter_addr,
            has_voted:false
        };
        table::add(&mut election.registered_voters, voter_addr, voter);
        event::emit(VoterRegEvent{
            voter_address: voter_addr,
            has_voted: false
        });
        


    }
    public entry fun vote(
        voter_address: &signer,
        election_id: u64,
        candidate_id:u64
    ) acquires ElectionManager{
        let voter_addr = signer::address_of(voter_address);
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global_mut<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow_mut(&mut election_manager.elections, election_id);
        assert!(option::is_none(&election.winner_id), E_ELECTION_HASWINNER);
        assert!(election.is_active, E_ELECTION_NOT_ACTIVE);
        assert!(table::contains(&election.registered_voters, voter_addr), E_VOTER_NOT_REGISTERED);
        assert!(table::contains(&election.candidates,candidate_id), E_INVALID_CANDIDATE);

        let voter = table::borrow_mut(&mut election.registered_voters, voter_addr);
        assert!(!voter.has_voted, E_ALREADY_VOTED);
        let candidate = table::borrow_mut(&mut election.candidates, candidate_id);
        voter.has_voted = true;
        candidate.votes = candidate.votes + 1;
        election.total_votes = election.total_votes + 1;
    event::emit(VoteEvent{
        voter_address: voter_addr,
        candidate_id,
        election_id
    })


    }
    public entry fun start_election(
        election_owner: &signer,
        election_id: u64,
        duration_seconds: u64
    ) acquires ElectionManager{
        let owners_address = signer::address_of(election_owner);
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global_mut<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow_mut(&mut election_manager.elections, election_id);
        assert!(option::is_none(&election.winner_id), E_ELECTION_HASWINNER);
        assert! ( election.election_owner == owners_address, E_INVALID_OWNER);
        assert!(election.is_active, E_ENDTIME_ALREADY_STARTED);
        election.is_active = true;
        election.start_time = option::some(timestamp::now_seconds());
        let end_time = timestamp::now_seconds() + duration_seconds;
        election.end_time = option::some(end_time);


    }
    public entry fun end_election (
        election_owner: &signer,
        election_id: u64,
    ) acquires ElectionManager {
        let owners_address = signer::address_of(election_owner);
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global_mut<ElectionManager>(@election_board);
        assert! (table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow_mut(&mut election_manager.elections, election_id);
        assert!(election.election_owner == owners_address, E_INVALID_OWNER);
        assert!(election.is_active, E_ELECTION_NOT_ACTIVE);

        let winner_id = 0u64;
        let highest_votes = 0u64;

        let i = 1;
        while (i <= election.candidate_count) {
            if (table::contains (&election.candidates, i)){
                let candidate = table::borrow(&election.candidates, i);
                if (candidate.votes > highest_votes){
                    highest_votes = candidate.votes;
                    winner_id = candidate.candidate_id;
                };
            };
        };
        if (winner_id > 0){
            election.winner_id = option::some(winner_id);
        }else {
            election.winner_id = option::none<u64>();
        };
        election.is_active = false;
        election_manager.ended_elections = election_manager.ended_elections + 1;

    }

    #[view]
    public fun get_election_info (
        election_id: u64
    ): (string::String, bool, option::Option<u64>, option::Option<u64>, u64 ) acquires ElectionManager {
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow(&election_manager.elections, election_id);
        (election.election_name, election.is_active, election.start_time, election.end_time, election.total_votes)


    }
    #[view]
    public fun has_voter_voted (
        election_id: u64,
        voter_addr: address
    ): bool acquires ElectionManager {
        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);
        let election_manager = borrow_global<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow(&election_manager.elections, election_id);
        if (!table::contains(&election.registered_voters, voter_addr)){
            return false
        };
        let voter = table::borrow(&election.registered_voters, voter_addr);
        voter.has_voted
     

    }
    #[view]
    public fun get_all_candidates(
        election_id: u64
    ): vector<CandidateDetails> acquires ElectionManager{

        assert!(exists<ElectionManager>(@election_board), E_NOT_INITIALIZED);

        let election_manager = borrow_global<ElectionManager>(@election_board);

        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);

        let election = table::borrow(&election_manager.elections, election_id);

        let candidates = vector::empty<CandidateDetails>();
        let i = 1;
         while (i <= election.candidate_count){

            if (table::contains(&election.candidates, i)){
                let candidate = table::borrow(&election.candidates, i);
                vector::push_back(&mut candidates, CandidateDetails{
                    candidate_id: candidate.candidate_id,
                    name: candidate.name,
                    candidate_address: candidate.candidate_address,
                    dao: candidate.dao,
                    image: candidate.image,
                    votes: candidate.votes
                });
            };
            i = i + 1
         };
         candidates

    }
    #[view]
    public fun get_winner (election_id: u64): option::Option<u64> acquires ElectionManager{
        let election_manager = borrow_global<ElectionManager>(@election_board);
        assert!(table::contains(&election_manager.elections, election_id), E_ELECTION_NOT_FOUND);
        let election = table::borrow(&election_manager.elections, election_id);
        election.winner_id
    }


}