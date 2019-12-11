var require = meteorInstall({"imports":{"api":{"accounts":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/accounts/server/methods.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);

let _;

module.link("lodash", {
  default(v) {
    _ = v;
  }

}, 2);
let Validators;
module.link("/imports/api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);

const fetchFromUrl = url => {
  try {
    let res = HTTP.get(LCD + url);

    if (res.statusCode == 200) {
      return res;
    }

    ;
  } catch (e) {
    console.log(e, 'methods.accounts.fetchFromUlr');
  }
};

Meteor.methods({
  'accounts.getAccountDetail': function (address) {
    this.unblock();
    let url = LCD + '/auth/accounts/' + address;

    try {
      let available = HTTP.get(url);

      if (available.statusCode == 200) {
        let response = _.isUndefined(available.data) ? JSON.parse(available.content) : available.data;
        response = _.isObject(response) && response != null && !_.isUndefined(response.result) ? response.result : response;
        let account;
        if (['auth/Account', 'cosmos-sdk/Account'].indexOf(response.type) >= 0) account = response.value;else if (['auth/DelayedVestingAccount', 'auth/ContinuousVestingAccount', 'cosmos-sdk/DelayedVestingAccount', 'cosmos-sdk/ContinuousVestingAccount'].indexOf(response.type) >= 0) account = response.value.BaseVestingAccount;
        if (account && _.get(account, 'BaseAccount.account_number', null) != null) return account;
        return null;
      }
    } catch (e) {
      console.log(e, 'methods.accounts.getAccountDetail');
    }
  },
  'accounts.getBalance': function (address) {
    this.unblock();
    let balance = {}; // get available atoms

    let url = LCD + '/bank/balances/' + address;

    try {
      let response = HTTP.get(url);

      if (response.statusCode == 200) {
        response = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
        balance.available = typeof response == 'object' && response != null && typeof response.result != undefined ? response.result : response;
        if (balance.available && balance.available.length > 0) balance.available = balance.available[0];
      }
    } catch (e) {
      console.log(e, 'methods.accounts.getBalance1');
    } // get delegated amnounts


    url = LCD + '/staking/delegators/' + address + '/delegations';

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        balance.delegations = JSON.parse(delegations.content).result;
      }
    } catch (e) {
      console.log(e, 'methods.accounts.getBalance2');
    } // get unbonding


    url = LCD + '/staking/delegators/' + address + '/unbonding_delegations';

    try {
      let unbonding = HTTP.get(url);

      if (unbonding.statusCode == 200) {
        balance.unbonding = JSON.parse(unbonding.content).result;
      }
    } catch (e) {
      console.log(e, 'methods.accounts.getBalance3');
    } // get rewards


    url = LCD + '/distribution/delegators/' + address + '/rewards';

    try {
      let rewards = HTTP.get(url);

      if (rewards.statusCode == 200) {
        balance.rewards = JSON.parse(rewards.content).result.total;
      }
    } catch (e) {
      console.log(e, 'methods.accounts.getBalance4');
    } // get commission


    let validator = Validators.findOne({
      $or: [{
        operator_address: address
      }, {
        delegator_address: address
      }, {
        address: address
      }]
    });

    if (validator) {
      let url = LCD + '/distribution/validators/' + validator.operator_address;
      balance.operator_address = validator.operator_address;

      try {
        let rewards = HTTP.get(url);

        if (rewards.statusCode == 200) {
          let content = JSON.parse(rewards.content).result;
          if (content.val_commission && content.val_commission.length > 0) balance.commission = content.val_commission[0];
        }
      } catch (e) {
        console.log(e, 'methods.accounts.getBalance5');
      }
    }

    return balance;
  },

  'accounts.getDelegation'(address, validator) {
    let url = `/staking/delegators/${address}/delegations/${validator}`;
    let delegations = fetchFromUrl(url);
    delegations = delegations && delegations.data.result;
    if (delegations && delegations.shares) delegations.shares = parseFloat(delegations.shares);
    url = `/staking/redelegations?delegator=${address}&validator_to=${validator}`;
    let relegations = fetchFromUrl(url);
    relegations = relegations && relegations.data.result;
    let completionTime;

    if (relegations) {
      relegations.forEach(relegation => {
        let entries = relegation.entries;
        let time = new Date(entries[entries.length - 1].completion_time);
        if (!completionTime || time > completionTime) completionTime = time;
      });
      delegations.redelegationCompletionTime = completionTime;
    }

    url = `/staking/delegators/${address}/unbonding_delegations/${validator}`;
    let undelegations = fetchFromUrl(url);
    undelegations = undelegations && undelegations.data.result;

    if (undelegations) {
      delegations.unbonding = undelegations.entries.length;
      delegations.unbondingCompletionTime = undelegations.entries[0].completion_time;
    }

    return delegations;
  },

  'accounts.getAllDelegations'(address) {
    let url = LCD + '/staking/delegators/' + address + '/delegations';

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        delegations = JSON.parse(delegations.content).result;

        if (delegations && delegations.length > 0) {
          delegations.forEach((delegation, i) => {
            if (delegations[i] && delegations[i].shares) delegations[i].shares = parseFloat(delegations[i].shares);
          });
        }

        return delegations;
      }

      ;
    } catch (e) {
      console.log(e, 'methods.accounts.getAllDelegations');
    }
  },

  'accounts.getAllUnbondings'(address) {
    let url = LCD + '/staking/delegators/' + address + '/unbonding_delegations';

    try {
      let unbondings = HTTP.get(url);

      if (unbondings.statusCode == 200) {
        unbondings = JSON.parse(unbondings.content).result;
        return unbondings;
      }

      ;
    } catch (e) {
      console.log(e, 'methods.accounts.getAllUnbondings');
    }
  },

  'accounts.getAllRedelegations'(address, validator) {
    let url = `/staking/redelegations?delegator=${address}&validator_from=${validator}`;
    let result = fetchFromUrl(url);

    if (result && result.data) {
      let redelegations = {};
      result.data.forEach(redelegation => {
        let entries = redelegation.entries;
        redelegations[redelegation.validator_dst_address] = {
          count: entries.length,
          completionTime: entries[0].completion_time
        };
      });
      return redelegations;
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"blocks":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/server/methods.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Promise;
module.link("meteor/promise", {
  Promise(v) {
    Promise = v;
  }

}, 2);
let Blockscon;
module.link("/imports/api/blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 3);
let Chain;
module.link("/imports/api/chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 4);
let ValidatorSets;
module.link("/imports/api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 5);
let Validators;
module.link("/imports/api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 6);
let ValidatorRecords, Analytics, VPDistributions;
module.link("/imports/api/records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  VPDistributions(v) {
    VPDistributions = v;
  }

}, 7);
let VotingPowerHistory;
module.link("/imports/api/voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 8);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 9);
let Evidences;
module.link("../../evidences/evidences.js", {
  Evidences(v) {
    Evidences = v;
  }

}, 10);
let sha256;
module.link("js-sha256", {
  sha256(v) {
    sha256 = v;
  }

}, 11);
let getAddress;
module.link("tendermint/lib/pubkey", {
  getAddress(v) {
    getAddress = v;
  }

}, 12);
let cheerio;
module.link("cheerio", {
  "*"(v) {
    cheerio = v;
  }

}, 13);

// import Block from '../../../ui/components/Block';
// getValidatorVotingPower = (validators, address) => {
//     for (v in validators){
//         if (validators[v].address == address){
//             return parseInt(validators[v].voting_power);
//         }
//     }
// }
getRemovedValidators = (prevValidators, validators) => {
  // let removeValidators = [];
  for (p in prevValidators) {
    for (v in validators) {
      if (prevValidators[p].address == validators[v].address) {
        prevValidators.splice(p, 1);
      }
    }
  }

  return prevValidators;
};

getValidatorProfileUrl = identity => {
  if (identity.length == 16) {
    let response = HTTP.get(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`);

    if (response.statusCode == 200) {
      let them = response.data.them;
      return them && them.length && them[0].pictures && them[0].pictures.primary && them[0].pictures.primary.url;
    } else {
      console.log(JSON.stringify(response), 'methods.blocks.getValidatorProfileUrl');
    }
  } else if (identity.indexOf("keybase.io/team/") > 0) {
    let teamPage = HTTP.get(identity);

    if (teamPage.statusCode == 200) {
      let page = cheerio.load(teamPage.content);
      return page(".kb-main-card img").attr('src');
    } else {
      console.log(JSON.stringify(teamPage), 'methods.blocks.getValidatorProfileUrl2');
    }
  }
}; // var filtered = [1, 2, 3, 4, 5].filter(notContainedIn([1, 2, 3, 5]));
// console.log(filtered); // [4]


Meteor.methods({
  'blocks.averageBlockTime'(address) {
    let blocks = Blockscon.find({
      proposerAddress: address
    }).fetch();
    let heights = blocks.map((block, i) => {
      return block.height;
    });
    let blocksStats = Analytics.find({
      height: {
        $in: heights
      }
    }).fetch(); // console.log(blocksStats);

    let totalBlockDiff = 0;

    for (b in blocksStats) {
      totalBlockDiff += blocksStats[b].timeDiff;
    }

    return totalBlockDiff / heights.length;
  },

  'blocks.findUpTime'(address) {
    let collection = ValidatorRecords.rawCollection(); // let aggregateQuery = Meteor.wrapAsync(collection.aggregate, collection);

    var pipeline = [{
      $match: {
        "address": address
      }
    }, // {$project:{address:1,height:1,exists:1}},
    {
      $sort: {
        "height": -1
      }
    }, {
      $limit: Meteor.settings.public.uptimeWindow - 1
    }, {
      $unwind: "$_id"
    }, {
      $group: {
        "_id": "$address",
        "uptime": {
          "$sum": {
            $cond: [{
              $eq: ['$exists', true]
            }, 1, 0]
          }
        }
      }
    }]; // let result = aggregateQuery(pipeline, { cursor: {} });

    return Promise.await(collection.aggregate(pipeline).toArray()); // return .aggregate()
  },

  'blocks.getLatestHeight': function () {
    this.unblock();
    let url = RPC + '/status';

    try {
      let response = HTTP.get(url);
      let status = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      status = typeof status == 'object' && status != null && status.result != undefined ? status.result : status;
      return status.sync_info.latest_block_height;
    } catch (e) {
      return 0;
    }
  },
  'blocks.getCurrentHeight': function () {
    this.unblock();
    let currHeight = Blockscon.find({}, {
      sort: {
        height: -1
      },
      limit: 1
    }).fetch(); // console.log("currentHeight:"+currHeight);

    let startHeight = Meteor.settings.params.startHeight;

    if (currHeight && currHeight.length == 1) {
      let height = currHeight[0].height;
      if (height > startHeight) return height;
    }

    return startHeight;
  },
  'blocks.blocksUpdate': function () {
    if (SYNCING) return "Syncing...";else console.log("start to sync"); // Meteor.clearInterval(Meteor.timerHandle);
    // get the latest height

    let until = Meteor.call('blocks.getLatestHeight'); // console.log(until);
    // get the current height in db

    let curr = Meteor.call('blocks.getCurrentHeight');
    console.log(curr); // loop if there's update in db

    if (until > curr) {
      SYNCING = true;
      let validatorSet = {}; // get latest validator candidate information

      url = LCD + '/staking/validators';

      try {
        response = HTTP.get(url);
        response = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
        response = typeof response == 'object' && response != null && response.result ? response.result : response;
        response.forEach(validator => validatorSet[validator.consensus_pubkey] = validator);
      } catch (e) {
        console.log(e, 'methods.blocks.blocksUpdate1');
      }

      url = LCD + '/staking/validators?status=unbonding';

      try {
        response = HTTP.get(url);
        response = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
        response = typeof response == 'object' && response != null && response.result != undefined ? response.result : response;
        response.forEach(validator => validatorSet[validator.consensus_pubkey] = validator);
      } catch (e) {
        console.log(e, 'methods.blocks.blocksUpdate2');
      }

      url = LCD + '/staking/validators?status=unbonded';

      try {
        response = HTTP.get(url);
        response = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
        response = typeof response == 'object' && response != null && response.result != undefined ? response.result : response;
        response.forEach(validator => validatorSet[validator.consensus_pubkey] = validator);
      } catch (e) {
        console.log(e, 'methods.blocks.blocksUpdate3');
      }

      let totalValidators = Object.keys(validatorSet).length;
      console.log("all validators: " + totalValidators);

      for (let height = curr + 1; height <= until; height++) {
        let startBlockTime = new Date(); // add timeout here? and outside this loop (for catched up and keep fetching)?

        this.unblock();
        let url = RPC + '/block?height=' + height;
        let analyticsData = {};
        console.log(url);

        try {
          const bulkValidators = Validators.rawCollection().initializeUnorderedBulkOp();
          const bulkValidatorRecords = ValidatorRecords.rawCollection().initializeUnorderedBulkOp();
          const bulkVPHistory = VotingPowerHistory.rawCollection().initializeUnorderedBulkOp();
          const bulkTransations = Transactions.rawCollection().initializeUnorderedBulkOp();
          let startGetHeightTime = new Date();
          let response = HTTP.get(url);

          if (response.statusCode == 200) {
            let block = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
            block = typeof block == 'object' && block != null && block.result != undefined ? block.result : block; // store height, hash, numtransaction and time in db

            let blockData = {};
            blockData.height = height;
            blockData.hash = block.block_meta.block_id.hash;
            blockData.transNum = block.block_meta.header.num_txs;
            blockData.time = new Date(block.block.header.time);
            blockData.lastBlockHash = block.block.header.last_block_id.hash;
            blockData.proposerAddress = block.block.header.proposer_address;
            blockData.validators = [];
            let precommits = block.block.last_commit.precommits;

            if (precommits != null) {
              // console.log(precommits.length);
              for (let i = 0; i < precommits.length; i++) {
                if (precommits[i] != null) {
                  blockData.validators.push(precommits[i].validator_address);
                }
              }

              analyticsData.precommits = precommits.length; // record for analytics
              // PrecommitRecords.insert({height:height, precommits:precommits.length});
            } // save txs in database


            if (block.block.data.txs && block.block.data.txs.length > 0) {
              for (t in block.block.data.txs) {
                Meteor.call('Transactions.index', sha256(Buffer.from(block.block.data.txs[t], 'base64')), blockData.time, (err, result) => {
                  if (err) {
                    console.log(err, 'methods.blocks.blocksUpdate4');
                  }
                });
              }
            } // save double sign evidences


            if (block.block.evidence.evidence) {
              Evidences.insert({
                height: height,
                evidence: block.block.evidence.evidence
              });
            }

            blockData.precommitsCount = blockData.validators.length;
            analyticsData.height = height;
            let endGetHeightTime = new Date();
            console.log("Get height time: " + (endGetHeightTime - startGetHeightTime) / 1000 + "seconds.");
            let startGetValidatorsTime = new Date(); // update chain status

            url = RPC + '/validators?height=' + height;
            response = HTTP.get(url);
            console.log(url);
            let validators = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
            validators = typeof validators == 'object' && validators != null && validators.result != undefined ? validators.result : validators;
            validators.block_height = parseInt(validators.block_height);
            ValidatorSets.insert(validators);
            blockData.validatorsCount = validators.validators.length;
            let startBlockInsertTime = new Date();
            Blockscon.insert(blockData);
            let endBlockInsertTime = new Date();
            console.log("Block insert time: " + (endBlockInsertTime - startBlockInsertTime) / 1000 + "seconds."); // store valdiators exist records

            let existingValidators = Validators.find({
              address: {
                $exists: true
              }
            }).fetch();

            if (height > 1) {
              // record precommits and calculate uptime
              // only record from block 2
              for (i in validators.validators) {
                let address = validators.validators[i].address;
                let record = {
                  height: height,
                  address: address,
                  exists: false,
                  voting_power: parseInt(validators.validators[i].voting_power) //getValidatorVotingPower(existingValidators, address)

                };

                for (j in precommits) {
                  if (precommits[j] != null) {
                    if (address == precommits[j].validator_address) {
                      record.exists = true;
                      precommits.splice(j, 1);
                      break;
                    }
                  }
                } // calculate the uptime based on the records stored in previous blocks
                // only do this every 15 blocks ~


                if (height % 15 == 0) {
                  // let startAggTime = new Date();
                  let numBlocks = Meteor.call('blocks.findUpTime', address);
                  let uptime = 0; // let endAggTime = new Date();
                  // console.log("Get aggregated uptime for "+existingValidators[i].address+": "+((endAggTime-startAggTime)/1000)+"seconds.");

                  if (numBlocks[0] != null && numBlocks[0].uptime != null) {
                    uptime = numBlocks[0].uptime;
                  }

                  let base = Meteor.settings.public.uptimeWindow;

                  if (height < base) {
                    base = height;
                  }

                  if (record.exists) {
                    if (uptime < base) {
                      uptime++;
                    }

                    uptime = uptime / base * 100;
                    bulkValidators.find({
                      address: address
                    }).upsert().updateOne({
                      $set: {
                        uptime: uptime,
                        lastSeen: blockData.time
                      }
                    });
                  } else {
                    uptime = uptime / base * 100;
                    bulkValidators.find({
                      address: address
                    }).upsert().updateOne({
                      $set: {
                        uptime: uptime
                      }
                    });
                  }
                }

                bulkValidatorRecords.insert(record); // ValidatorRecords.update({height:height,address:record.address},record);
              }
            }

            let chainStatus = Chain.findOne({
              chainId: block.block_meta.header.chain_id
            });
            let lastSyncedTime = chainStatus ? chainStatus.lastSyncedTime : 0;
            let timeDiff;
            let blockTime = Meteor.settings.params.defaultBlockTime;

            if (lastSyncedTime) {
              let dateLatest = blockData.time;
              let dateLast = new Date(lastSyncedTime);
              timeDiff = Math.abs(dateLatest.getTime() - dateLast.getTime());
              blockTime = (chainStatus.blockTime * (blockData.height - 1) + timeDiff) / blockData.height;
            }

            let endGetValidatorsTime = new Date();
            console.log("Get height validators time: " + (endGetValidatorsTime - startGetValidatorsTime) / 1000 + "seconds.");
            Chain.update({
              chainId: block.block_meta.header.chain_id
            }, {
              $set: {
                lastSyncedTime: blockData.time,
                blockTime: blockTime
              }
            });
            analyticsData.averageBlockTime = blockTime;
            analyticsData.timeDiff = timeDiff;
            analyticsData.time = blockData.time; // initialize validator data at first block
            // if (height == 1){
            //     Validators.remove({});
            // }

            analyticsData.voting_power = 0;
            let startFindValidatorsNameTime = new Date();

            if (validators) {
              // validators are all the validators in the current height
              console.log("validatorSet size: " + validators.validators.length);

              for (v in validators.validators) {
                // Validators.insert(validators.validators[v]);
                let validator = validators.validators[v];
                validator.voting_power = parseInt(validator.voting_power);
                validator.proposer_priority = parseInt(validator.proposer_priority);
                let valExist = Validators.findOne({
                  "pub_key.value": validator.pub_key.value
                });

                if (!valExist) {
                  console.log(`validator pub_key ${validator.address} ${validator.pub_key.value} not in db`); // let command = Meteor.settings.bin.gaiadebug+" pubkey "+validator.pub_key.value;
                  // console.log(command);
                  // let tempVal = validator;

                  validator.address = getAddress(validator.pub_key);
                  validator.accpub = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixAccPub);
                  validator.operator_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixValPub);
                  validator.consensus_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixConsPub);
                  let validatorData = validatorSet[validator.consensus_pubkey];

                  if (validatorData) {
                    if (validatorData.description.identity) validator.profile_url = getValidatorProfileUrl(validatorData.description.identity);
                    validator.operator_address = validatorData.operator_address;
                    validator.delegator_address = Meteor.call('getDelegator', validatorData.operator_address);
                    validator.jailed = validatorData.jailed;
                    validator.status = validatorData.status;
                    validator.min_self_delegation = validatorData.min_self_delegation;
                    validator.tokens = validatorData.tokens;
                    validator.delegator_shares = validatorData.delegator_shares;
                    validator.description = validatorData.description;
                    validator.bond_height = validatorData.bond_height;
                    validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                    validator.unbonding_height = validatorData.unbonding_height;
                    validator.unbonding_time = validatorData.unbonding_time;
                    validator.commission = validatorData.commission;
                    validator.self_delegation = validator.delegator_shares; // validator.removed = false,
                    // validator.removedAt = 0
                    // validatorSet.splice(val, 1);
                  } else {
                    console.log('no con pub key?');
                  } // bulkValidators.insert(validator);


                  bulkValidators.find({
                    consensus_pubkey: validator.consensus_pubkey
                  }).upsert().updateOne({
                    $set: validator
                  }); // console.log("validator first appears: "+bulkValidators.length);

                  bulkVPHistory.insert({
                    address: validator.address,
                    prev_voting_power: 0,
                    voting_power: validator.voting_power,
                    type: 'add',
                    height: blockData.height,
                    block_time: blockData.time
                  }); // Meteor.call('runCode', command, function(error, result){
                  // validator.address = result.match(/\s[0-9A-F]{40}$/igm);
                  // validator.address = validator.address[0].trim();
                  // validator.hex = result.match(/\s[0-9A-F]{64}$/igm);
                  // validator.hex = validator.hex[0].trim();
                  // validator.cosmosaccpub = result.match(/cosmospub.*$/igm);
                  // validator.cosmosaccpub = validator.cosmosaccpub[0].trim();
                  // validator.operator_pubkey = result.match(/cosmosvaloperpub.*$/igm);
                  // validator.operator_pubkey = validator.operator_pubkey[0].trim();
                  // validator.consensus_pubkey = result.match(/cosmosvalconspub.*$/igm);
                  // validator.consensus_pubkey = validator.consensus_pubkey[0].trim();
                  // });
                } else {
                  let validatorData = validatorSet[valExist.consensus_pubkey];

                  if (validatorData) {
                    if (validatorData.description && (!valExist.description || validatorData.description.identity !== valExist.description.identity)) validator.profile_url = getValidatorProfileUrl(validatorData.description.identity);
                    validator.jailed = validatorData.jailed;
                    validator.status = validatorData.status;
                    validator.tokens = validatorData.tokens;
                    validator.delegator_shares = validatorData.delegator_shares;
                    validator.description = validatorData.description;
                    validator.bond_height = validatorData.bond_height;
                    validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                    validator.unbonding_height = validatorData.unbonding_height;
                    validator.unbonding_time = validatorData.unbonding_time;
                    validator.commission = validatorData.commission; // calculate self delegation percentage every 30 blocks

                    if (height % 30 == 1) {
                      try {
                        let response = HTTP.get(LCD + '/staking/delegators/' + valExist.delegator_address + '/delegations/' + valExist.operator_address);

                        if (response.statusCode == 200) {
                          let selfDelegation = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
                          selfDelegation = typeof selfDelegation == 'object' && selfDelegation != null && selfDelegation.result != undefined ? selfDelegation.result : selfDelegation;

                          if (selfDelegation.shares) {
                            validator.self_delegation = parseFloat(selfDelegation.shares) / parseFloat(validator.delegator_shares);
                          }
                        }
                      } catch (e) {// console.log(e);
                      }
                    }

                    bulkValidators.find({
                      consensus_pubkey: valExist.consensus_pubkey
                    }).updateOne({
                      $set: validator
                    }); // console.log("validator exisits: "+bulkValidators.length);
                    // validatorSet.splice(val, 1);
                  } else {
                    console.log('no con pub key?');
                  }

                  let prevVotingPower = VotingPowerHistory.findOne({
                    address: validator.address
                  }, {
                    height: -1,
                    limit: 1
                  });

                  if (prevVotingPower) {
                    if (prevVotingPower.voting_power != validator.voting_power) {
                      let changeType = prevVotingPower.voting_power > validator.voting_power ? 'down' : 'up';
                      let changeData = {
                        address: validator.address,
                        prev_voting_power: prevVotingPower.voting_power,
                        voting_power: validator.voting_power,
                        type: changeType,
                        height: blockData.height,
                        block_time: blockData.time
                      }; // console.log('voting power changed.');
                      // console.log(changeData);

                      bulkVPHistory.insert(changeData);
                    }
                  }
                } // console.log(validator);


                analyticsData.voting_power += validator.voting_power;
              } // if there is validator removed


              let prevValidators = ValidatorSets.findOne({
                block_height: height - 1
              });

              if (prevValidators) {
                let removedValidators = getRemovedValidators(prevValidators.validators, validators.validators);

                for (r in removedValidators) {
                  bulkVPHistory.insert({
                    address: removedValidators[r].address,
                    prev_voting_power: removedValidators[r].voting_power,
                    voting_power: 0,
                    type: 'remove',
                    height: blockData.height,
                    block_time: blockData.time
                  });
                }
              }
            } // check if there's any validator not in db 14400 blocks(~1 day)


            if (height % 14400 == 0) {
              try {
                console.log('Checking all validators against db...');
                let dbValidators = {};
                Validators.find({}, {
                  fields: {
                    consensus_pubkey: 1,
                    status: 1
                  }
                }).forEach(v => dbValidators[v.consensus_pubkey] = v.status);
                Object.keys(validatorSet).forEach(conPubKey => {
                  let validatorData = validatorSet[conPubKey]; // Active validators should have been updated in previous steps

                  if (validatorData.status === 2) return;

                  if (dbValidators[conPubKey] == undefined) {
                    console.log(`validator with consensus_pubkey ${conPubKey} not in db`);
                    validatorData.pub_key = {
                      "type": "tendermint/PubKeyEd25519",
                      "value": Meteor.call('bech32ToPubkey', conPubKey)
                    };
                    validatorData.address = getAddress(validatorData.pub_key);
                    validatorData.delegator_address = Meteor.call('getDelegator', validatorData.operator_address);
                    validatorData.accpub = Meteor.call('pubkeyToBech32', validatorData.pub_key, Meteor.settings.public.bech32PrefixAccPub);
                    validatorData.operator_pubkey = Meteor.call('pubkeyToBech32', validatorData.pub_key, Meteor.settings.public.bech32PrefixValPub);
                    console.log(JSON.stringify(validatorData));
                    bulkValidators.find({
                      consensus_pubkey: conPubKey
                    }).upsert().updateOne({
                      $set: validatorData
                    });
                  } else if (dbValidators[conPubKey] == 2) {
                    bulkValidators.find({
                      consensus_pubkey: conPubKey
                    }).upsert().updateOne({
                      $set: validatorData
                    });
                  }
                });
              } catch (e) {
                console.log(e, 'methods.blocks.blocksUpdate5');
              }
            } // fetching keybase every 14400 blocks(~1 day)


            if (height % 14400 == 1) {
              console.log('Fetching keybase...');
              Validators.find({}).forEach(validator => {
                try {
                  let profileUrl = getValidatorProfileUrl(validator.description.identity);

                  if (profileUrl) {
                    bulkValidators.find({
                      address: validator.address
                    }).upsert().updateOne({
                      $set: {
                        'profile_url': profileUrl
                      }
                    });
                  }
                } catch (e) {
                  console.log(e, 'methods.blocks.blocksUpdate6');
                }
              });
            }

            let endFindValidatorsNameTime = new Date();
            console.log("Get validators name time: " + (endFindValidatorsNameTime - startFindValidatorsNameTime) / 1000 + "seconds."); // record for analytics

            let startAnayticsInsertTime = new Date();
            Analytics.insert(analyticsData);
            let endAnalyticsInsertTime = new Date();
            console.log("Analytics insert time: " + (endAnalyticsInsertTime - startAnayticsInsertTime) / 1000 + "seconds.");
            let startVUpTime = new Date();

            if (bulkValidators.length > 0) {
              // console.log(bulkValidators.length);
              bulkValidators.execute((err, result) => {
                if (err) {
                  console.log(err, 'methods.blocks.blocksUpdate7');
                }

                if (result) {// console.log(result);
                }
              });
            }

            let endVUpTime = new Date();
            console.log("Validator update time: " + (endVUpTime - startVUpTime) / 1000 + "seconds.");
            let startVRTime = new Date();

            if (bulkValidatorRecords.length > 0) {
              bulkValidatorRecords.execute((err, result) => {
                if (err) {
                  console.log(err, 'methods.blocks.blocksUpdate26');
                }
              });
            }

            let endVRTime = new Date();
            console.log("Validator records update time: " + (endVRTime - startVRTime) / 1000 + "seconds.");

            if (bulkVPHistory.length > 0) {
              bulkVPHistory.execute((err, result) => {
                if (err) {
                  console.log(err, 'methods.blocks.blocksUpdate8');
                }
              });
            }

            if (bulkTransations.length > 0) {
              bulkTransations.execute((err, result) => {
                if (err) {
                  console.log(err, 'methods.blocks.blocksUpdate9');
                }
              });
            } // calculate voting power distribution every 60 blocks ~ 5mins


            if (height % 60 == 1) {
              console.log("===== calculate voting power distribution =====");
              let activeValidators = Validators.find({
                status: 2,
                jailed: false
              }, {
                sort: {
                  voting_power: -1
                }
              }).fetch();
              let numTopTwenty = Math.ceil(activeValidators.length * 0.2);
              let numBottomEighty = activeValidators.length - numTopTwenty;
              let topTwentyPower = 0;
              let bottomEightyPower = 0;
              let numTopThirtyFour = 0;
              let numBottomSixtySix = 0;
              let topThirtyFourPercent = 0;
              let bottomSixtySixPercent = 0;

              for (v in activeValidators) {
                if (v < numTopTwenty) {
                  topTwentyPower += activeValidators[v].voting_power;
                } else {
                  bottomEightyPower += activeValidators[v].voting_power;
                }

                if (topThirtyFourPercent < 0.34) {
                  topThirtyFourPercent += activeValidators[v].voting_power / analyticsData.voting_power;
                  numTopThirtyFour++;
                }
              }

              bottomSixtySixPercent = 1 - topThirtyFourPercent;
              numBottomSixtySix = activeValidators.length - numTopThirtyFour;
              let vpDist = {
                height: height,
                numTopTwenty: numTopTwenty,
                topTwentyPower: topTwentyPower,
                numBottomEighty: numBottomEighty,
                bottomEightyPower: bottomEightyPower,
                numTopThirtyFour: numTopThirtyFour,
                topThirtyFourPercent: topThirtyFourPercent,
                numBottomSixtySix: numBottomSixtySix,
                bottomSixtySixPercent: bottomSixtySixPercent,
                numValidators: activeValidators.length,
                totalVotingPower: analyticsData.voting_power,
                blockTime: blockData.time,
                createAt: new Date()
              };
              console.log(vpDist);
              VPDistributions.insert(vpDist);
            }
          }
        } catch (e) {
          console.log(e, 'methods.blocks.blocksUpdate10');
          SYNCING = false;
          return "Stopped";
        }

        let endBlockTime = new Date();
        console.log("This block used: " + (endBlockTime - startBlockTime) / 1000 + "seconds.");
      }

      SYNCING = false;
      Chain.update({
        chainId: Meteor.settings.public.chainId
      }, {
        $set: {
          lastBlocksSyncedTime: new Date(),
          totalValidators: totalValidators
        }
      });
    }

    return until;
  },
  'addLimit': function (limit) {
    // console.log(limit+10)
    return limit + 10;
  },
  'hasMore': function (limit) {
    if (limit > Meteor.call('getCurrentHeight')) {
      return false;
    } else {
      return true;
    }
  },
  'blockListPagination': function (page, limit, sort_field, sort_order) {
    let countAll = Blockscon.find().count();
    let response = {
      pagination: {
        total_page: Math.round(countAll / limit),
        total_record: countAll,
        current_page: page,
        from: (page - 1) * limit + 1,
        to: page * limit
      }
    };
    let offset = page * limit;
    let data = Blockscon.find({}, {
      sort: {
        [sort_field]: sort_order == 'desc' ? -1 : 1
      },
      skip: offset,
      limit: limit
    }).fetch();
    response.data = data ? data.map(v => {
      v.validator = v.proposer();
      return v;
    }) : [];
    return JSON.stringify(response);
  },
  'blockDetailByHeight': function (height) {
    let response = {
      data: {}
    };
    let block = Blockscon.find({
      height: height
    }).fetch();

    if (block) {
      response.data = block.map(v => {
        let transactions = Meteor.call('Transactions.findByHeight', height);
        v.transactions = transactions ? transactions : [];
        v.validator = v.proposer();
        return v;
      })[0];
    }

    return JSON.stringify(response);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/server/publications.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Blockscon;
module.link("../blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 3);
publishComposite('blocks.height', function (limit) {
  return {
    find() {
      return Blockscon.find({}, {
        limit: limit,
        sort: {
          height: -1
        }
      });
    },

    children: [{
      find(block) {
        return Validators.find({
          address: block.proposerAddress
        }, {
          limit: 1
        });
      }

    }]
  };
});
publishComposite('blocks.findOne', function (height) {
  return {
    find() {
      return Blockscon.find({
        height: height
      });
    },

    children: [{
      find(block) {
        return Transactions.find({
          height: block.height
        });
      }

    }, {
      find(block) {
        return Validators.find({
          address: block.proposerAddress
        }, {
          limit: 1
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"blocks.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/blocks.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Blockscon: () => Blockscon
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const Blockscon = new Mongo.Collection('blocks');
Blockscon.helpers({
  proposer() {
    return Validators.findOne({
      address: this.proposerAddress
    });
  }

}); // Blockscon.helpers({
//     sorted(limit) {
//         return Blockscon.find({}, {sort: {height:-1}, limit: limit});
//     }
// });
// Meteor.setInterval(function() {
//     Meteor.call('blocksUpdate', (error, result) => {
//         console.log(result);
//     })
// }, 30000000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"chain":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/server/methods.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let getAddress;
module.link("tendermint/lib/pubkey.js", {
  getAddress(v) {
    getAddress = v;
  }

}, 2);
let moment;
module.link("moment", {
  default(v) {
    moment = v;
  }

}, 3);

let _;

module.link("lodash", {
  default(v) {
    _ = v;
  }

}, 4);
let Chain, ChainStates;
module.link("../chain.js", {
  Chain(v) {
    Chain = v;
  },

  ChainStates(v) {
    ChainStates = v;
  }

}, 5);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 6);
let VotingPowerHistory;
module.link("../../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 7);

findVotingPower = (validator, genValidators) => {
  for (let v in genValidators) {
    if (validator.pub_key.value == genValidators[v].pub_key.value) {
      return parseInt(genValidators[v].power);
    }
  }
};

Meteor.methods({
  'chain.getConsensusState': function () {
    this.unblock();
    let url = RPC + '/dump_consensus_state';

    try {
      let response = HTTP.get(url);
      let consensus = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      consensus = typeof consensus == 'object' && consensus != null && consensus.result != undefined ? consensus.result : consensus;
      let height = consensus.round_state.height;
      let round = consensus.round_state.round;
      let step = consensus.round_state.step;
      let votedPower = Math.round(parseFloat(consensus.round_state.votes[round].prevotes_bit_array.split(" ")[3]) * 100);
      Chain.update({
        chainId: Meteor.settings.public.chainId
      }, {
        $set: {
          votingHeight: height,
          votingRound: round,
          votingStep: step,
          votedPower: votedPower,
          proposerAddress: consensus.round_state.validators.proposer.address,
          prevotes: consensus.round_state.votes[round].prevotes,
          precommits: consensus.round_state.votes[round].precommits
        }
      });
    } catch (e) {
      console.log(e, 'methods.chain.getConsensusState');
    }
  },
  'chain.updateStatus': function () {
    this.unblock();
    let url = RPC + '/status';

    try {
      let response = HTTP.get(url);
      let status = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      status = typeof status == 'object' && status != null && status.result != undefined ? status.result : status;
      let chain = {};
      chain.chainId = status.node_info.network;
      chain.latestBlockHeight = status.sync_info.latest_block_height;
      chain.latestBlockTime = status.sync_info.latest_block_time;
      let latestState = ChainStates.findOne({}, {
        sort: {
          height: -1
        }
      });

      if (latestState && latestState.height >= chain.latestBlockHeight) {
        return `no updates (getting block ${chain.latestBlockHeight} at block ${latestState.height})`;
      }

      url = RPC + '/validators';
      response = HTTP.get(url);
      let validators = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      validators = typeof validators == 'object' && validators != null && validators.result != undefined ? validators.result : validators;
      validators = typeof validators == 'object' && validators != null && validators.validators != undefined ? validators.validators : validators;
      chain.validators = validators.length;
      let activeVP = 0;

      for (v in validators) {
        activeVP += parseInt(validators[v].voting_power);
      }

      chain.activeVotingPower = activeVP;
      Chain.update({
        chainId: chain.chainId
      }, {
        $set: chain
      }, {
        upsert: true
      }); // Get chain states

      if (parseInt(chain.latestBlockHeight) > 0) {
        let chainStates = {};
        chainStates.height = parseInt(status.sync_info.latest_block_height);
        chainStates.time = new Date(status.sync_info.latest_block_time);
        url = LCD + '/staking/pool';

        try {
          response = HTTP.get(url);
          let bonding = response.data; // chain.bondedTokens = bonding.bonded_tokens;
          // chain.notBondedTokens = bonding.not_bonded_tokens;

          chainStates.bondedTokens = parseInt(bonding.bonded_tokens);
          chainStates.notBondedTokens = parseInt(bonding.not_bonded_tokens);
        } catch (e) {
          console.log(e, 'chain.updateStatus');
        }

        url = LCD + '/distribution/community_pool';

        try {
          response = HTTP.get(url);
          let pool = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
          pool = typeof pool == 'object' && pool != null && pool.result != undefined ? pool.result : pool;

          if (pool && pool.length > 0) {
            chainStates.communityPool = [];
            pool.forEach((amount, i) => {
              chainStates.communityPool.push({
                denom: amount.denom,
                amount: parseFloat(amount.amount)
              });
            });
          }
        } catch (e) {
          console.log(e, 'chain.updateStatus2');
        }

        url = LCD + '/minting/inflation';

        try {
          response = HTTP.get(url);
          let inflation = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
          inflation = typeof inflation == 'object' && inflation != null && inflation.result != undefined ? inflation.result : inflation;

          if (inflation) {
            chainStates.inflation = parseFloat(inflation);
          }
        } catch (e) {
          console.log(e, 'chain.updateStatus3');
        }

        url = LCD + '/minting/annual-provisions';

        try {
          response = HTTP.get(url);
          let provisions = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
          provisions = typeof provisions == 'object' && provisions != null && provisions.result != undefined ? provisions.result : provisions;

          if (provisions) {
            chainStates.annualProvisions = parseFloat(provisions);
          }
        } catch (e) {
          console.log(e, 'chain.updateStatus4');
        }

        ChainStates.insert(chainStates);
      } // chain.totalVotingPower = totalVP;
      // validators = Validators.find({}).fetch();
      // console.log(validators);


      return chain.latestBlockHeight;
    } catch (e) {
      console.log(e, 'chain.updateStatus5');
      return "Error getting chain status.";
    }
  },
  'chain.getLatestStatus': function () {
    Chain.find().sort({
      created: -1
    }).limit(1);
  },
  'chain.genesis': function () {
    let chain = Chain.findOne({
      chainId: Meteor.settings.public.chainId
    });
    
    console.log(Meteor.settings);

    if (chain && chain.readGenesis) {
      console.log('Genesis file has been processed');
    } else {
      console.log('=== Start processing genesis file ===');
      let response = HTTP.get("http://54.178.210.145:26657/genesis");
      let genesis = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      genesis = typeof genesis == 'object' && genesis != null && genesis.result != undefined ? genesis.result : genesis;
      genesis = genesis.genesis;

      let distr = genesis.app_state.distr || genesis.app_state.distribution;
      let chainParams = {
        chainId: genesis.chain_id,
        genesisTime: genesis.genesis_time,
        consensusParams: genesis.consensus_params,
        auth: genesis.app_state.auth,
        bank: genesis.app_state.bank,
        staking: {
          pool: genesis.app_state.staking.pool,
          params: genesis.app_state.staking.params
        },
        mint: genesis.app_state.mint,
        distr: {
          communityTax: distr.community_tax,
          baseProposerReward: distr.base_proposer_reward,
          bonusProposerReward: distr.bonus_proposer_reward,
          withdrawAddrEnabled: distr.withdraw_addr_enabled
        },
        gov: {
          startingProposalId: genesis.app_state.gov.starting_proposal_id,
          depositParams: genesis.app_state.gov.deposit_params,
          votingParams: genesis.app_state.gov.voting_params,
          tallyParams: genesis.app_state.gov.tally_params
        },
        slashing: {
          params: genesis.app_state.slashing.params
        },
        supply: genesis.app_state.supply,
        crisis: genesis.app_state.crisis
      };
      let totalVotingPower = 0; // read gentx

      if (genesis.app_state.genutil && genesis.app_state.genutil.gentxs && genesis.app_state.genutil.gentxs.length > 0) {
        for (i in genesis.app_state.genutil.gentxs) {
          let msg = genesis.app_state.genutil.gentxs[i].value.msg; // console.log(msg.type);

          for (m in msg) {
            if (msg[m].type == "cosmos-sdk/MsgCreateValidator") {
              console.log(msg[m].value); // let command = Meteor.settings.bin.gaiadebug+" pubkey "+msg[m].value.pubkey;

              let validator = {
                consensus_pubkey: msg[m].value.pubkey,
                description: msg[m].value.description,
                commission: msg[m].value.commission,
                min_self_delegation: msg[m].value.min_self_delegation,
                operator_address: msg[m].value.validator_address,
                delegator_address: msg[m].value.delegator_address,
                voting_power: Math.floor(parseInt(msg[m].value.value.amount) / Meteor.settings.public.stakingFraction),
                jailed: false,
                status: 2
              };
              totalVotingPower += validator.voting_power;
              let pubkeyValue = Meteor.call('bech32ToPubkey', msg[m].value.pubkey); // Validators.upsert({consensus_pubkey:msg[m].value.pubkey},validator);

              validator.pub_key = {
                "type": "tendermint/PubKeyEd25519",
                "value": pubkeyValue
              };
              validator.address = getAddress(validator.pub_key);
              validator.accpub = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixAccPub);
              validator.operator_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixValPub);
              VotingPowerHistory.insert({
                address: validator.address,
                prev_voting_power: 0,
                voting_power: validator.voting_power,
                type: 'add',
                height: 0,
                block_time: genesis.genesis_time
              });
              Validators.insert(validator);
            }
          }
        }
      } // read validators from previous chain


      console.log('read validators from previous chain');
      if (genesis.app_state.staking.validators && genesis.app_state.staking.validators.length > 0) {
        console.log(genesis.app_state.staking.validators.length);
        let genValidatorsSet = genesis.app_state.staking.validators;
        let genValidators = genesis.validators;

        for (let v in genValidatorsSet) {
          // console.log(genValidators[v]);
          let validator = genValidatorsSet[v];
          validator.delegator_address = Meteor.call('getDelegator', genValidatorsSet[v].operator_address);
          let pubkeyValue = Meteor.call('bech32ToPubkey', validator.consensus_pubkey);
          validator.pub_key = {
            "type": "tendermint/PubKeyEd25519",
            "value": pubkeyValue
          };
          validator.address = getAddress(validator.pub_key);
          validator.pub_key = validator.pub_key;
          validator.accpub = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixAccPub);
          validator.operator_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixValPub);
          validator.voting_power = findVotingPower(validator, genValidators);
          totalVotingPower += validator.voting_power;
          Validators.upsert({
            consensus_pubkey: validator.consensus_pubkey
          }, validator);
          VotingPowerHistory.insert({
            address: validator.address,
            prev_voting_power: 0,
            voting_power: validator.voting_power,
            type: 'add',
            height: 0,
            block_time: genesis.genesis_time
          });
        }
      }

      chainParams.readGenesis = true;
      chainParams.activeVotingPower = totalVotingPower;
      let result = Chain.upsert({
        chainId: chainParams.chainId
      }, {
        $set: chainParams
      });
      console.log('=== Finished processing genesis file ===');
    }

    return true;
  },
  'chainStates.height24hChange': function () {
    let query = [];
    let _data = [];

    for (var i = 1; i <= 24; i++) {
      _data.push(moment().subtract(i, 'h'));

      query.push({
        time: {
          $lt: new Date(moment().subtract(i, 'h').toDate()),
          $gt: new Date(moment().subtract(i, 'h').subtract(1, 'minutes').toDate())
        }
      });
    }

    let data = ChainStates.find({
      $or: query
    }, {
      sort: {
        time: -1
      }
    }).fetch().map(v => {
      return {
        bondedTokens: parseInt(v.bondedTokens),
        notBondedTokens: parseInt(v.notBondedTokens),
        time: moment(v.time).format('YYYY-MM-DD HH:mm')
      };
    });
    let data_24h = [];

    _.each(_data, function (v) {
      let value = _.first(_.filter(data, function (val) {
        return moment(val.time).format('x') <= v.format('x') && moment(val.time).format('x') >= v.subtract(1, 'minutes').format('x');
      }));

      data_24h.push(value);
    });

    return data_24h;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/server/publications.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Chain, ChainStates;
module.link("../chain.js", {
  Chain(v) {
    Chain = v;
  },

  ChainStates(v) {
    ChainStates = v;
  }

}, 1);
let CoinStats;
module.link("../../coin-stats/coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
Meteor.publish('chainStates.latest', function () {
  return [ChainStates.find({}, {
    sort: {
      height: -1
    },
    limit: 1
  }), CoinStats.find({}, {
    sort: {
      last_updated_at: -1
    },
    limit: 1
  })];
});
publishComposite('chain.status', function () {
  return {
    find() {
      return Chain.find({
        chainId: Meteor.settings.public.chainId
      });
    },

    children: [{
      find(chain) {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            operator_address: 1,
            status: -1,
            jailed: 1,
            profile_url: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"chain.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/chain.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Chain: () => Chain,
  ChainStates: () => ChainStates
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const Chain = new Mongo.Collection('chain');
const ChainStates = new Mongo.Collection('chain_states');
Chain.helpers({
  proposer() {
    return Validators.findOne({
      address: this.proposerAddress
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"coin-stats":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/coin-stats/server/methods.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);

let _;

module.link("lodash", {
  default(v) {
    _ = v;
  }

}, 1);
let moment;
module.link("moment", {
  default(v) {
    moment = v;
  }

}, 2);
let CoinStats;
module.link("../coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 3);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 4);
Meteor.methods({
  'coinStats.getCoinStats': function () {
    this.unblock();
    let coinId = Meteor.settings.public.coingeckoId;

    if (coinId) {
      try {
        let now = new Date();
        now.setMinutes(0);
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=" + coinId + "&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true";
        let response = HTTP.get(url);

        if (response.statusCode == 200) {
          // console.log(JSON.parse(response.content));
          let data = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
          data = typeof data == 'object' && data != null && data.result != undefined ? data.result : data;
          data = data[coinId]; // console.log(coinStats);

          return CoinStats.upsert({
            last_updated_at: data.last_updated_at
          }, {
            $set: data
          });
        }
      } catch (e) {
        console.log(e, 'methods.coinStats.getCoinStats');
      }
    } else {
      return "No coingecko Id provided.";
    }
  },
  'coinStats.getStats': function () {
    this.unblock();
    let coinId = Meteor.settings.public.coingeckoId;

    if (coinId) {
      return CoinStats.findOne({}, {
        sort: {
          last_updated_at: -1
        }
      });
    } else {
      return "No coingecko Id provided.";
    }
  },
  'coinStats.price24hChange': function () {
    let query = [];
    let _data = [];

    for (var i = 1; i <= 24; i++) {
      _data.push(moment().subtract(i, 'h'));

      query.push({
        last_updated_at: {
          $lt: Math.round(parseInt(moment().subtract(i, 'h').format('x')) / Math.pow(10, 3)),
          $gt: Math.round(parseInt(moment().subtract(i, 'h').subtract(10, 'minutes').format('x')) / Math.pow(10, 3))
        }
      });
    }

    let data = CoinStats.find({
      $or: query
    }, {
      sort: {
        last_updated_at: -1
      }
    }).fetch().map(v => {
      return {
        usd: parseFloat(v.usd),
        last_updated_at: v.last_updated_at,
        time: moment.unix(v.last_updated_at).format('YYYY-MM-DD HH:mm')
      };
    });
    let data_24h = [];

    _.each(_data, function (v) {
      let value = _.first(_.filter(data, function (val) {
        return parseInt(val.last_updated_at) <= Math.round(parseInt(v.format('x')) / Math.pow(10, 3)) && parseInt(val.last_updated_at) >= Math.round(parseInt(v.subtract(10, 'minutes').format('x')) / Math.pow(10, 3));
      }));

      data_24h.push(value);
    });

    return data_24h;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"coin-stats.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/coin-stats/coin-stats.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CoinStats: () => CoinStats
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const CoinStats = new Mongo.Collection('coin_stats');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"delegations":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/server/methods.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Delegations;
module.link("../delegations.js", {
  Delegations(v) {
    Delegations = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
Meteor.methods({
  'delegations.getDelegations': function () {
    this.unblock();
    let validators = Validators.find({}).fetch();
    let delegations = [];
    console.log("=== Getting delegations ===");

    for (v in validators) {
      if (validators[v].operator_address) {
        let url = LCD + '/staking/validators/' + validators[v].operator_address + "/delegations";

        try {
          let response = HTTP.get(url);

          if (response.statusCode == 200) {
            let delegation = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
            delegation = typeof delegation != 'object' && delegations != null && delegation.result != undefined ? delegation.result : delegation; // console.log(delegation);

            delegations = delegations.concat(delegation);
          } else {
            console.log(response.statusCode, 'methods.delegations.getDelegations1');
          }
        } catch (e) {
          console.log(e, 'methods.delegations.getDelegations2');
        }
      }
    }

    for (i in delegations) {
      if (delegations[i] && delegations[i].shares) delegations[i].shares = parseFloat(delegations[i].shares);
    } // console.log(delegations);


    let data = {
      delegations: delegations,
      createdAt: new Date()
    };
    return Delegations.insert(data);
  } // 'blocks.averageBlockTime'(address){
  //     let blocks = Blockscon.find({proposerAddress:address}).fetch();
  //     let heights = blocks.map((block, i) => {
  //         return block.height;
  //     });
  //     let blocksStats = Analytics.find({height:{$in:heights}}).fetch();
  //     // console.log(blocksStats);
  //     let totalBlockDiff = 0;
  //     for (b in blocksStats){
  //         totalBlockDiff += blocksStats[b].timeDiff;
  //     }
  //     return totalBlockDiff/heights.length;
  // }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/server/publications.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"delegations.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/delegations.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Delegations: () => Delegations
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Delegations = new Mongo.Collection('delegations');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"ledger":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/ledger/server/methods.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 0);
Meteor.methods({
  'transaction.submit': function (txInfo) {
    const url = `${LCD}/txs`;
    data = {
      "tx": txInfo.value,
      "mode": "sync"
    };
    const timestamp = new Date().getTime();
    console.log(`submitting transaction${timestamp} ${url} with data ${JSON.stringify(data)}`);
    let response = HTTP.post(url, {
      data
    });
    console.log(`response for transaction${timestamp} ${url}: ${JSON.stringify(response)}`);

    if (response.statusCode == 200) {
      let data = response.data;
      if (data.code) throw new Meteor.Error(data.code, JSON.parse(data.raw_log).message);
      return response.data.txhash;
    }
  },
  'transaction.execute': function (body, path) {
    const url = `${LCD}/${path}`;
    data = {
      "base_req": (0, _objectSpread2.default)({}, body, {
        "chain_id": Meteor.settings.public.chainId,
        "simulate": false
      })
    };
    let response = HTTP.post(url, {
      data
    });

    if (response.statusCode == 200) {
      return typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
    }
  },
  'transaction.simulate': function (txMsg, from, path, adjustment = '1.2') {
    const url = `${LCD}/${path}`;
    data = (0, _objectSpread2.default)({}, txMsg, {
      "base_req": {
        "from": from,
        "chain_id": Meteor.settings.public.chainId,
        "gas_adjustment": adjustment,
        "simulate": true
      }
    });
    let response = HTTP.post(url, {
      data
    });

    if (response.statusCode == 200) {
      return typeof response.data != 'undefined' ? response.data.gas_estimate : JSON.parse(response.content).gas_estimate;
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"proposals":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/server/methods.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Proposals;
module.link("../proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
// import { Promise } from 'meteor/promise';
Meteor.methods({
  'proposals.getProposals': function () {
    this.unblock();

    try {
      let url = LCD + '/gov/proposals';
      let response = HTTP.get(url);
      let proposals = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
      proposals = typeof proposals == 'object' && proposals != null && proposals.result != undefined ? proposals.result : proposals;
      let finishedProposalIds = new Set(Proposals.find({
        "proposal_status": {
          $in: ["Passed", "Rejected", "Removed"]
        }
      }).fetch().map(p => p.proposalId));
      let proposalIds = [];

      if (proposals.length > 0) {
        // Proposals.upsert()
        const bulkProposals = Proposals.rawCollection().initializeUnorderedBulkOp();

        for (let i in proposals) {
          let proposal = proposals[i];
          proposal.proposalId = parseInt(proposal.proposal_id);

          if (proposal.proposalId > 0 && !finishedProposalIds.has(proposal.proposalId)) {
            try {
              let url = LCD + '/gov/proposals/' + proposal.proposalId + '/proposer';
              let response = HTTP.get(url);

              if (response.statusCode == 200) {
                let proposer = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
                proposer = typeof proposer == 'object' && proposer != null && proposer.result != undefined ? proposer.result : proposer;

                if (proposer.proposal_id && proposer.proposal_id == proposal.proposal_id) {
                  proposal.proposer = proposer.proposer;
                }
              }

              bulkProposals.find({
                proposalId: proposal.proposalId
              }).upsert().updateOne({
                $set: proposal
              });
              proposalIds.push(proposal.proposalId);
            } catch (e) {
              bulkProposals.find({
                proposalId: proposal.proposalId
              }).upsert().updateOne({
                $set: proposal
              });
              proposalIds.push(proposal.proposalId);
              console.log(e.response.content, 'proposals.getProposals1');
            }
          }
        }

        bulkProposals.find({
          proposalId: {
            $nin: proposalIds
          },
          proposal_status: {
            $nin: ["Passed", "Rejected", "Removed"]
          }
        }).update({
          $set: {
            "proposal_status": "Removed"
          }
        });
        bulkProposals.execute();
      }

      return true;
    } catch (e) {
      console.log(e, 'proposals.getProposals2');
    }
  },
  'proposals.getProposalResults': function () {
    this.unblock();
    let proposals = Proposals.find({
      "proposal_status": {
        $nin: ["Passed", "Rejected", "Removed"]
      }
    }).fetch();

    if (proposals && proposals.length > 0) {
      for (let i in proposals) {
        if (parseInt(proposals[i].proposalId) > 0) {
          try {
            // get proposal deposits
            let url = LCD + '/gov/proposals/' + proposals[i].proposalId + '/deposits';
            let response = HTTP.get(url);
            let proposal = {
              proposalId: proposals[i].proposalId
            };

            if (response.statusCode == 200) {
              let deposits = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
              deposits = typeof deposits == 'object' && deposits != null && deposits.result != undefined ? deposits.result : deposits;
              proposal.deposits = deposits;
            }

            url = LCD + '/gov/proposals/' + proposals[i].proposalId + '/votes';
            response = HTTP.get(url);

            if (response.statusCode == 200) {
              let votes = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
              votes = typeof votes == 'object' && votes != null && votes.result != undefined ? votes.result : votes;
              proposal.votes = getVoteDetail(votes);
            }

            url = LCD + '/gov/proposals/' + proposals[i].proposalId + '/tally';
            response = HTTP.get(url);

            if (response.statusCode == 200) {
              let tally = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
              tally = typeof tally == 'object' && tally != null && tally.result != undefined ? tally.result : tally;
              proposal.tally = tally;
            }

            proposal.updatedAt = new Date();
            Proposals.update({
              proposalId: proposals[i].proposalId
            }, {
              $set: proposal
            });
          } catch (e) {}
        }
      }
    }

    return true;
  },
  'proposals.all': function () {
    return JSON.stringify(Proposals.find({}, {
      sort: {
        proposalId: -1
      }
    }).fetch());
  },
  'proposals.proposalById': function (id) {
    return JSON.stringify(Proposals.find({
      proposal_id: id
    }, {
      limit: 1
    }).fetch());
  }
});

const getVoteDetail = votes => {
  if (!votes) {
    return [];
  }

  let voters = votes.map(vote => vote.voter);
  let votingPowerMap = {};
  let validatorAddressMap = {};
  Validators.find({
    delegator_address: {
      $in: voters
    }
  }).forEach(validator => {
    votingPowerMap[validator.delegator_address] = {
      moniker: validator.description.moniker,
      address: validator.address,
      tokens: parseFloat(validator.tokens),
      delegatorShares: parseFloat(validator.delegator_shares),
      deductedShares: parseFloat(validator.delegator_shares)
    };
    validatorAddressMap[validator.operator_address] = validator.delegator_address;
  });
  voters.forEach(voter => {
    if (!votingPowerMap[voter]) {
      // voter is not a validator
      let url = `${LCD}/staking/delegators/${voter}/delegations`;
      let delegations;
      let votingPower = 0;

      try {
        let response = HTTP.get(url);

        if (response.statusCode == 200) {
          delegations = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
          delegations = typeof delegations == 'object' && delegations != null && delegations.result != undefined ? delegations.result : delegations;

          if (delegations && delegations.length > 0) {
            delegations.forEach(delegation => {
              let shares = parseFloat(delegation.shares);

              if (validatorAddressMap[delegation.validator_address]) {
                // deduct delegated shareds from validator if a delegator votes
                let validator = votingPowerMap[validatorAddressMap[delegation.validator_address]];
                validator.deductedShares -= shares;

                if (validator.delegator_shares != 0) {
                  // avoiding division by zero
                  votingPower += shares / validator.delegatorShares * validator.tokens;
                }
              } else {
                let validator = Validators.findOne({
                  operator_address: delegation.validator_address
                });

                if (validator && validator.delegator_shares != 0) {
                  // avoiding division by zero
                  votingPower += shares / parseFloat(validator.delegator_shares) * parseFloat(validator.tokens);
                }
              }
            });
          }
        }
      } catch (e) {
        console.log(e, 'methods.proposals.getVoteDetail');
      }

      votingPowerMap[voter] = {
        votingPower: votingPower
      };
    }
  });
  return votes.map(vote => {
    let voter = votingPowerMap[vote.voter];
    let votingPower = voter.votingPower;

    if (votingPower == undefined) {
      // voter is a validator
      votingPower = voter.delegatorShares ? voter.deductedShares / voter.delegatorShares * voter.tokens : 0;
    }

    return (0, _objectSpread2.default)({}, vote, {
      votingPower
    });
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/server/publications.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Proposals;
module.link("../proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
Meteor.publish('proposals.list', function () {
  return Proposals.find({}, {
    sort: {
      proposalId: -1
    }
  });
});
Meteor.publish('proposals.one', function (id) {
  check(id, Number);
  return Proposals.find({
    proposalId: id
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"proposals.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/proposals.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Proposals: () => Proposals
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Proposals = new Mongo.Collection('proposals');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"records":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/server/methods.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 1);
let ValidatorRecords, Analytics, AverageData, AverageValidatorData;
module.link("../records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  AverageData(v) {
    AverageData = v;
  },

  AverageValidatorData(v) {
    AverageValidatorData = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
let ValidatorSets;
module.link("/imports/api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 4);
let Status;
module.link("../../status/status.js", {
  Status(v) {
    Status = v;
  }

}, 5);
let MissedBlocksStats;
module.link("../records.js", {
  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  }

}, 6);
let MissedBlocks;
module.link("../records.js", {
  MissedBlocks(v) {
    MissedBlocks = v;
  }

}, 7);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 8);
let Chain;
module.link("../../chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 9);

let _;

module.link("lodash", {
  default(v) {
    _ = v;
  }

}, 10);
const BULKUPDATEMAXSIZE = 1000;

const getBlockStats = (startHeight, latestHeight) => {
  let blockStats = {};
  const cond = {
    $and: [{
      height: {
        $gt: startHeight
      }
    }, {
      height: {
        $lte: latestHeight
      }
    }]
  };
  const options = {
    sort: {
      height: 1
    }
  };
  Blockscon.find(cond, options).forEach(block => {
    blockStats[block.height] = {
      height: block.height,
      proposerAddress: block.proposerAddress,
      precommitsCount: block.precommitsCount,
      validatorsCount: block.validatorsCount,
      validators: block.validators,
      time: block.time
    };
  });
  Analytics.find(cond, options).forEach(block => {
    if (!blockStats[block.height]) {
      blockStats[block.height] = {
        height: block.height
      };
      console.log(`block ${block.height} does not have an entry`);
    }

    _.assign(blockStats[block.height], {
      precommits: block.precommits,
      averageBlockTime: block.averageBlockTime,
      timeDiff: block.timeDiff,
      voting_power: block.voting_power
    });
  });
  return blockStats;
};

const getPreviousRecord = (voterAddress, proposerAddress) => {
  let previousRecord = MissedBlocks.findOne({
    voter: voterAddress,
    proposer: proposerAddress,
    blockHeight: -1
  });
  let lastUpdatedHeight = Meteor.settings.params.startHeight;
  let prevStats = {};

  if (previousRecord) {
    prevStats = _.pick(previousRecord, ['missCount', 'totalCount']);
  } else {
    prevStats = {
      missCount: 0,
      totalCount: 0
    };
  }

  return prevStats;
};

Meteor.methods({
  'ValidatorRecords.calculateMissedBlocks': function () {
    if (!COUNTMISSEDBLOCKS) {
      try {
        let startTime = Date.now();
        COUNTMISSEDBLOCKS = true;
        console.log('calulate missed blocks count');
        this.unblock();
        let validators = Validators.find({}).fetch();
        let latestHeight = Meteor.call('blocks.getCurrentHeight');
        let explorerStatus = Status.findOne({
          chainId: Meteor.settings.public.chainId
        });
        let startHeight = explorerStatus && explorerStatus.lastProcessedMissedBlockHeight ? explorerStatus.lastProcessedMissedBlockHeight : Meteor.settings.params.startHeight;
        latestHeight = Math.min(startHeight + BULKUPDATEMAXSIZE, latestHeight);
        const bulkMissedStats = MissedBlocks.rawCollection().initializeOrderedBulkOp();
        let validatorsMap = {};
        validators.forEach(validator => validatorsMap[validator.address] = validator); // a map of block height to block stats

        let blockStats = getBlockStats(startHeight, latestHeight); // proposerVoterStats is a proposer-voter map counting numbers of proposed blocks of which voter is an active validator

        let proposerVoterStats = {};

        _.forEach(blockStats, (block, blockHeight) => {
          let proposerAddress = block.proposerAddress;
          let votedValidators = new Set(block.validators);
          let validatorSets = ValidatorSets.findOne({
            block_height: block.height
          });
          let votedVotingPower = 0;
          validatorSets.validators.forEach(activeValidator => {
            if (votedValidators.has(activeValidator.address)) votedVotingPower += parseFloat(activeValidator.voting_power);
          });
          validatorSets.validators.forEach(activeValidator => {
            let currentValidator = activeValidator.address;

            if (!_.has(proposerVoterStats, [proposerAddress, currentValidator])) {
              let prevStats = getPreviousRecord(currentValidator, proposerAddress);

              _.set(proposerVoterStats, [proposerAddress, currentValidator], prevStats);
            }

            _.update(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'], n => n + 1);

            if (!votedValidators.has(currentValidator)) {
              _.update(proposerVoterStats, [proposerAddress, currentValidator, 'missCount'], n => n + 1);

              bulkMissedStats.insert({
                voter: currentValidator,
                blockHeight: block.height,
                proposer: proposerAddress,
                precommitsCount: block.precommitsCount,
                validatorsCount: block.validatorsCount,
                time: block.time,
                precommits: block.precommits,
                averageBlockTime: block.averageBlockTime,
                timeDiff: block.timeDiff,
                votingPower: block.voting_power,
                votedVotingPower,
                updatedAt: latestHeight,
                missCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'missCount']),
                totalCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'])
              });
            }
          });
        });

        _.forEach(proposerVoterStats, (voters, proposerAddress) => {
          _.forEach(voters, (stats, voterAddress) => {
            bulkMissedStats.find({
              voter: voterAddress,
              proposer: proposerAddress,
              blockHeight: -1
            }).upsert().updateOne({
              $set: {
                voter: voterAddress,
                proposer: proposerAddress,
                blockHeight: -1,
                updatedAt: latestHeight,
                missCount: _.get(stats, 'missCount'),
                totalCount: _.get(stats, 'totalCount')
              }
            });
          });
        });

        let message = '';

        if (bulkMissedStats.length > 0) {
          const client = MissedBlocks._driver.mongo.client; // TODO: add transaction back after replica set(#146) is set up
          // let session = client.startSession();
          // session.startTransaction();

          let bulkPromise = bulkMissedStats.execute(null
          /*, {session}*/
          ).then(Meteor.bindEnvironment((result, err) => {
            if (err) {
              COUNTMISSEDBLOCKS = false; // Promise.await(session.abortTransaction());

              throw err;
            }

            if (result) {
              // Promise.await(session.commitTransaction());
              message = `(${result.result.nInserted} inserted, ` + `${result.result.nUpserted} upserted, ` + `${result.result.nModified} modified)`;
            }
          }));
          Promise.await(bulkPromise);
        }

        COUNTMISSEDBLOCKS = false;
        Status.upsert({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastProcessedMissedBlockHeight: latestHeight,
            lastProcessedMissedBlockTime: new Date()
          }
        });
        return `done in ${Date.now() - startTime}ms ${message}`;
      } catch (e) {
        COUNTMISSEDBLOCKS = false;
        throw e;
      }
    } else {
      return "updating...";
    }
  },
  'ValidatorRecords.calculateMissedBlocksStats': function () {
    // TODO: deprecate this method and MissedBlocksStats collection
    // console.log("ValidatorRecords.calculateMissedBlocks: "+COUNTMISSEDBLOCKS);
    if (!COUNTMISSEDBLOCKSSTATS) {
      COUNTMISSEDBLOCKSSTATS = true;
      console.log('calulate missed blocks stats');
      this.unblock();
      let validators = Validators.find({}).fetch();
      let latestHeight = Meteor.call('blocks.getCurrentHeight');
      let explorerStatus = Status.findOne({
        chainId: Meteor.settings.public.chainId
      });
      let startHeight = explorerStatus && explorerStatus.lastMissedBlockHeight ? explorerStatus.lastMissedBlockHeight : Meteor.settings.params.startHeight; // console.log(latestHeight);
      // console.log(startHeight);

      const bulkMissedStats = MissedBlocksStats.rawCollection().initializeUnorderedBulkOp();

      for (i in validators) {
        // if ((validators[i].address == "B8552EAC0D123A6BF609123047A5181D45EE90B5") || (validators[i].address == "69D99B2C66043ACBEAA8447525C356AFC6408E0C") || (validators[i].address == "35AD7A2CD2FC71711A675830EC1158082273D457")){
        let voterAddress = validators[i].address;
        let missedRecords = ValidatorRecords.find({
          address: voterAddress,
          exists: false,
          $and: [{
            height: {
              $gt: startHeight
            }
          }, {
            height: {
              $lte: latestHeight
            }
          }]
        }).fetch();
        let counts = {}; // console.log("missedRecords to process: "+missedRecords.length);

        for (b in missedRecords) {
          let block = Blockscon.findOne({
            height: missedRecords[b].height
          });
          let existingRecord = MissedBlocksStats.findOne({
            voter: voterAddress,
            proposer: block.proposerAddress
          });

          if (typeof counts[block.proposerAddress] === 'undefined') {
            if (existingRecord) {
              counts[block.proposerAddress] = existingRecord.count + 1;
            } else {
              counts[block.proposerAddress] = 1;
            }
          } else {
            counts[block.proposerAddress]++;
          }
        }

        for (address in counts) {
          let data = {
            voter: voterAddress,
            proposer: address,
            count: counts[address]
          };
          bulkMissedStats.find({
            voter: voterAddress,
            proposer: address
          }).upsert().updateOne({
            $set: data
          });
        } // }

      }

      if (bulkMissedStats.length > 0) {
        bulkMissedStats.execute(Meteor.bindEnvironment((err, result) => {
          if (err) {
            COUNTMISSEDBLOCKSSTATS = false;
            console.log(err, 'methods.records.ValidatorRecords.calculateMissedBlocksStats');
          }

          if (result) {
            Status.upsert({
              chainId: Meteor.settings.public.chainId
            }, {
              $set: {
                lastMissedBlockHeight: latestHeight,
                lastMissedBlockTime: new Date()
              }
            });
            COUNTMISSEDBLOCKSSTATS = false;
            console.log("done");
          }
        }));
      } else {
        COUNTMISSEDBLOCKSSTATS = false;
      }

      return true;
    } else {
      return "updating...";
    }
  },
  'Analytics.aggregateBlockTimeAndVotingPower': function (time) {
    this.unblock();
    let now = new Date();

    if (time == 'm') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastMinuteVotingPower: averageVotingPower,
            lastMinuteBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    }

    if (time == 'h') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 60 * 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastHourVotingPower: averageVotingPower,
            lastHourBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    }

    if (time == 'd') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastDayVotingPower: averageVotingPower,
            lastDayBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    } // return analytics.length;

  },
  'Analytics.aggregateValidatorDailyBlockTime': function () {
    this.unblock();
    let validators = Validators.find({}).fetch();
    let now = new Date();

    for (i in validators) {
      let averageBlockTime = 0;
      let blocks = Blockscon.find({
        proposerAddress: validators[i].address,
        "time": {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }, {
        fields: {
          height: 1
        }
      }).fetch();

      if (blocks.length > 0) {
        let blockHeights = [];

        for (b in blocks) {
          blockHeights.push(blocks[b].height);
        }

        let analytics = Analytics.find({
          height: {
            $in: blockHeights
          }
        }, {
          fields: {
            height: 1,
            timeDiff: 1
          }
        }).fetch();

        for (a in analytics) {
          averageBlockTime += analytics[a].timeDiff;
        }

        averageBlockTime = averageBlockTime / analytics.length;
      }

      AverageValidatorData.insert({
        proposerAddress: validators[i].address,
        averageBlockTime: averageBlockTime,
        type: 'ValidatorDailyAverageBlockTime',
        createdAt: now
      });
    }

    return true;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/server/publications.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let ValidatorRecords, Analytics, MissedBlocks, MissedBlocksStats, VPDistributions;
module.link("../records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  MissedBlocks(v) {
    MissedBlocks = v;
  },

  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  },

  VPDistributions(v) {
    VPDistributions = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
Meteor.publish('validator_records.all', function () {
  return ValidatorRecords.find();
});
Meteor.publish('validator_records.uptime', function (address, num) {
  return ValidatorRecords.find({
    address: address
  }, {
    limit: num,
    sort: {
      height: -1
    }
  });
});
Meteor.publish('analytics.history', function () {
  return Analytics.find({}, {
    sort: {
      height: -1
    },
    limit: 50
  });
});
Meteor.publish('vpDistribution.latest', function () {
  return VPDistributions.find({}, {
    sort: {
      height: -1
    },
    limit: 1
  });
});
publishComposite('missedblocks.validator', function (address, type) {
  let conditions = {};

  if (type == 'voter') {
    conditions = {
      voter: address
    };
  } else {
    conditions = {
      proposer: address
    };
  }

  return {
    find() {
      return MissedBlocksStats.find(conditions);
    },

    children: [{
      find(stats) {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            profile_url: 1
          }
        });
      }

    }]
  };
});
publishComposite('missedrecords.validator', function (address, type) {
  return {
    find() {
      return MissedBlocks.find({
        [type]: address
      }, {
        sort: {
          updatedAt: -1
        }
      });
    },

    children: [{
      find() {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            operator_address: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"records.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/records.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ValidatorRecords: () => ValidatorRecords,
  Analytics: () => Analytics,
  MissedBlocksStats: () => MissedBlocksStats,
  MissedBlocks: () => MissedBlocks,
  VPDistributions: () => VPDistributions,
  AverageData: () => AverageData,
  AverageValidatorData: () => AverageValidatorData
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const ValidatorRecords = new Mongo.Collection('validator_records');
const Analytics = new Mongo.Collection('analytics');
const MissedBlocksStats = new Mongo.Collection('missed_blocks_stats');
const MissedBlocks = new Mongo.Collection('missed_blocks');
const VPDistributions = new Mongo.Collection('voting_power_distributions');
const AverageData = new Mongo.Collection('average_data');
const AverageValidatorData = new Mongo.Collection('average_validator_data');
MissedBlocksStats.helpers({
  proposerMoniker() {
    let validator = Validators.findOne({
      address: this.proposer
    });
    return validator.description ? validator.description.moniker : this.proposer;
  },

  voterMoniker() {
    let validator = Validators.findOne({
      address: this.voter
    });
    return validator.description ? validator.description.moniker : this.voter;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"status":{"server":{"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/status/server/publications.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Status;
module.link("../status.js", {
  Status(v) {
    Status = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
Meteor.publish('status.status', function () {
  return Status.find({
    chainId: Meteor.settings.public.chainId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"status.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/status/status.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Status: () => Status
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Status = new Mongo.Collection('status');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"transactions":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/server/methods.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
let VotingPowerHistory;
module.link("../../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 4);
const AddressLength = 40;
Meteor.methods({
  'Transactions.index': function (hash, blockTime) {
    this.unblock();
    hash = hash.toUpperCase();
    let url = LCD + '/txs/' + hash;
    let response = HTTP.get(url);
    let tx = typeof response.data != 'undefined' ? response.data : JSON.parse(response.content);
    tx = typeof tx == 'object' && tx != null && tx.result != undefined ? tx.result : tx;
    console.log(hash, 'methods.transaction.Transactions.index');
    tx.height = parseInt(tx.height); // if (!tx.code){
    //     let msg = tx.tx.value.msg;
    //     for (let m in msg){
    //         if (msg[m].type == "cosmos-sdk/MsgCreateValidator"){
    //             console.log(msg[m].value);
    //             let command = Meteor.settings.bin.gaiadebug+" pubkey "+msg[m].value.pubkey;
    //             let validator = {
    //                 consensus_pubkey: msg[m].value.pubkey,
    //                 description: msg[m].value.description,
    //                 commission: msg[m].value.commission,
    //                 min_self_delegation: msg[m].value.min_self_delegation,
    //                 operator_address: msg[m].value.validator_address,
    //                 delegator_address: msg[m].value.delegator_address,
    //                 voting_power: Math.floor(parseInt(msg[m].value.value.amount) / 1000000)
    //             }
    //             Meteor.call('runCode', command, function(error, result){
    //                 validator.address = result.match(/\s[0-9A-F]{40}$/igm);
    //                 validator.address = validator.address[0].trim();
    //                 validator.hex = result.match(/\s[0-9A-F]{64}$/igm);
    //                 validator.hex = validator.hex[0].trim();
    //                 validator.pub_key = result.match(/{".*"}/igm);
    //                 validator.pub_key = JSON.parse(validator.pub_key[0].trim());
    //                 let re = new RegExp(Meteor.settings.public.bech32PrefixAccPub+".*$","igm");
    //                 validator.cosmosaccpub = result.match(re);
    //                 validator.cosmosaccpub = validator.cosmosaccpub[0].trim();
    //                 re = new RegExp(Meteor.settings.public.bech32PrefixValPub+".*$","igm");
    //                 validator.operator_pubkey = result.match(re);
    //                 validator.operator_pubkey = validator.operator_pubkey[0].trim();
    //                 Validators.upsert({consensus_pubkey:msg[m].value.pubkey},validator);
    //                 VotingPowerHistory.insert({
    //                     address: validator.address,
    //                     prev_voting_power: 0,
    //                     voting_power: validator.voting_power,
    //                     type: 'add',
    //                     height: tx.height+2,
    //                     block_time: blockTime
    //                 });
    //             })
    //         }
    //     }
    // }

    let txId = Transactions.insert(tx);

    if (txId) {
      return txId;
    } else return false;
  },
  'Transactions.findDelegation': function (address, height) {
    // following cosmos-sdk/x/slashing/spec/06_events.md and cosmos-sdk/x/staking/spec/06_events.md
    return Transactions.find({
      $or: [{
        $and: [{
          "events.type": "delegate"
        }, {
          "events.attributes.key": "validator"
        }, {
          "events.attributes.value": address
        }]
      }, {
        $and: [{
          "events.attributes.key": "action"
        }, {
          "events.attributes.value": "unjail"
        }, {
          "events.attributes.key": "sender"
        }, {
          "events.attributes.value": address
        }]
      }, {
        $and: [{
          "events.type": "create_validator"
        }, {
          "events.attributes.key": "validator"
        }, {
          "events.attributes.value": address
        }]
      }, {
        $and: [{
          "events.type": "unbond"
        }, {
          "events.attributes.key": "validator"
        }, {
          "events.attributes.value": address
        }]
      }, {
        $and: [{
          "events.type": "redelegate"
        }, {
          "events.attributes.key": "destination_validator"
        }, {
          "events.attributes.value": address
        }]
      }],
      "code": {
        $exists: false
      },
      height: {
        $lt: height
      }
    }, {
      sort: {
        height: -1
      },
      limit: 1
    }).fetch();
  },
  'Transactions.findUser': function (address, fields = null) {
    // address is either delegator address or validator operator address
    let validator;
    if (!fields) fields = {
      address: 1,
      description: 1,
      operator_address: 1,
      delegator_address: 1
    };

    if (address.includes(Meteor.settings.public.bech32PrefixValAddr)) {
      // validator operator address
      validator = Validators.findOne({
        operator_address: address
      }, {
        fields
      });
    } else if (address.includes(Meteor.settings.public.bech32PrefixAccAddr)) {
      // delegator address
      validator = Validators.findOne({
        delegator_address: address
      }, {
        fields
      });
    } else if (address.length === AddressLength) {
      validator = Validators.findOne({
        address: address
      }, {
        fields
      });
    }

    if (validator) {
      return validator;
    }

    return false;
  },
  'Transactions.detailByHash': function (hash) {
    return JSON.stringify(Transactions.find({
      txhash: hash
    }).fetch());
  },
  'Transactions.findByHeight': function (height) {
    return Transactions.find({
      height: height
    }, {
      sort: {
        timestamp: -1
      }
    }).fetch();
  },
  'Transactions.pagination': function (page, limit) {
    let countAll = Transactions.find().count();
    let response = {
      pagination: {
        total_page: Math.round(countAll / limit),
        total_record: countAll,
        current_page: page,
        from: (page - 1) * limit + 1,
        to: page * limit
      }
    };
    let offset = page * limit;
    response.data = Transactions.find({}, {
      sort: {
        height: -1
      },
      skip: offset,
      limit: limit
    }).fetch();
    return JSON.stringify(response);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/server/publications.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Transactions;
module.link("../transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 1);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 2);
publishComposite('transactions.list', function (limit = 30) {
  return {
    find() {
      return Transactions.find({}, {
        sort: {
          height: -1
        },
        limit: limit
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.validator', function (validatorAddress, delegatorAddress, limit = 100) {
  let query = {};

  if (validatorAddress && delegatorAddress) {
    query = {
      $or: [{
        "events.attributes.value": validatorAddress
      }, {
        "events.attributes.value": delegatorAddress
      }]
    };
  }

  if (!validatorAddress && delegatorAddress) {
    query = {
      "events.attributes.value": delegatorAddress
    };
  }

  return {
    find() {
      return Transactions.find(query, {
        sort: {
          height: -1
        },
        limit: limit
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.findOne', function (hash) {
  return {
    find() {
      return Transactions.find({
        txhash: hash
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.height', function (height) {
  return {
    find() {
      return Transactions.find({
        height: height
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"transactions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/transactions.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Transactions: () => Transactions
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Blockscon;
module.link("../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 1);
const Transactions = new Mongo.Collection('transactions');
Transactions.helpers({
  block() {
    return Blockscon.findOne({
      height: this.height
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validators":{"server":{"methods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/server/methods.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 1);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 2);
let Delegations;
module.link("../../delegations/delegations.js", {
  Delegations(v) {
    Delegations = v;
  }

}, 3);
let Validators;
module.link("../validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 4);
let MissedBlocks;
module.link("../../records/records.js", {
  MissedBlocks(v) {
    MissedBlocks = v;
  }

}, 5);
let ChainStates;
module.link("../../chain/chain.js", {
  ChainStates(v) {
    ChainStates = v;
  }

}, 6);
let VotingPowerHistory;
module.link("../../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 7);
Meteor.methods({
  "Validators.findCreateValidatorTime": function (address) {
    // look up the create validator time to consider if the validator has never updated the commission
    let tx = Transactions.findOne({
      $and: [{
        "tx.value.msg.value.delegator_address": address
      }, {
        "tx.value.msg.type": "cosmos-sdk/MsgCreateValidator"
      }, {
        code: {
          $exists: false
        }
      }]
    });

    if (tx) {
      let block = Blockscon.findOne({
        height: tx.height
      });

      if (block) {
        return block.time;
      }
    } else {
      // no such create validator tx
      return false;
    }
  },

  // async 'Validators.getAllDelegations'(address){
  "Validators.getAllDelegations"(address) {
    let url = LCD + "/staking/validators/" + address + "/delegations";

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        delegations = typeof delegations.data != "undefined" ? delegations.data : JSON.parse(delegations.content);
        delegations = typeof delegations == "object" && delegations != null && delegations.result != undefined ? delegations.result : delegations;
        delegations.forEach((delegation, i) => {
          if (delegations[i] && delegations[i].shares) delegations[i].shares = parseFloat(delegations[i].shares);
        });
        return delegations;
      }
    } catch (e) {
      console.log(e, 'methods.Validators.getAllDelegations');
    }
  },

  "Validators.detailByAddress": function (address) {
    let delegations = Delegations.findOne({
      delegations: {
        $elemMatch: {
          validator_address: address
        }
      }
    }, {
      sort: {
        createdAt: -1
      }
    });
    let lastChainStats = ChainStates.find({}, {
      sort: {
        time: -1
      },
      limit: 1
    }).fetch().map(v => v.bondedTokens);
    return JSON.stringify(Validators.find({
      operator_pubkey: address
    }).fetch().map(v => {
      v.delegators = delegations ? delegations.delegations : [];
      let miss_blocks = MissedBlocks.find({
        proposer: v.address
      }, {
        sort: {
          blockHeight: -1
        },
        skip: 0,
        limit: 100
      }).fetch().map(val => val.blockHeight);
      v.miss_blocks = miss_blocks ? miss_blocks : [];
      let proposed_blocks = Blockscon.find({
        proposerAddress: v.address
      }, {
        sort: {
          height: -1
        }
      }).fetch();
      v.proposed_blocks = proposed_blocks ? proposed_blocks : [];
      v.bondedTokens = lastChainStats ? lastChainStats[0] : 0;
      let power_events = VotingPowerHistory.find({
        address: v.address
      }, {
        sort: {
          block_time: -1
        }
      }).fetch().map(val => {
        val.block = Blockscon.findOne({
          height: val.height
        });
        return val;
      });
      v.power_history = power_events ? power_events : [];
      return v;
    }));
  },
  "Validators.pagination": function (jailed_value, page, limit) {
    let response = Validators.find({
      jailed: {
        $exists: true,
        $eq: jailed_value
      },
      voting_power: {
        $exists: true,
        $gt: 0
      }
    }, {
      sort: {
        voting_power: -1
      },
      skip: 0,
      limit: limit
    }).fetch();
    return JSON.stringify(response);
  },
  "Validators.count": function () {
    return {
      total_validator_num: Validators.find().count(),
      unjailed_validator_num: Validators.find({
        jailed: false
      }).count()
    };
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/server/publications.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Validators;
module.link("../validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
let ValidatorRecords;
module.link("../../records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  }

}, 2);
let VotingPowerHistory;
module.link("../../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 3);
Meteor.publish('validators.all', function (sort = "description.moniker", direction = -1, fields = {}) {
  return Validators.find({}, {
    sort: {
      [sort]: direction
    },
    fields: fields
  });
});
publishComposite('validators.firstSeen', {
  find() {
    return Validators.find({});
  },

  children: [{
    find(val) {
      return ValidatorRecords.find({
        address: val.address
      }, {
        sort: {
          height: 1
        },
        limit: 1
      });
    }

  }]
});
Meteor.publish('validators.voting_power', function () {
  return Validators.find({
    status: 2,
    jailed: false
  }, {
    sort: {
      voting_power: -1
    },
    fields: {
      address: 1,
      description: 1,
      voting_power: 1,
      profile_url: 1
    }
  });
});
publishComposite('validator.details', function (address) {
  let options = {
    address: address
  };

  if (address.indexOf(Meteor.settings.public.bech32PrefixValAddr) != -1) {
    options = {
      operator_address: address
    };
  }

  return {
    find() {
      return Validators.find(options);
    },

    children: [{
      find(val) {
        return VotingPowerHistory.find({
          address: val.address
        }, {
          sort: {
            height: -1
          },
          limit: 50
        });
      }

    }, {
      find(val) {
        return ValidatorRecords.find({
          address: val.address
        }, {
          sort: {
            height: -1
          },
          limit: Meteor.settings.public.uptimeWindow
        });
      }

    }]
  };
});
Meteor.publish('validators.count', function () {
  return Validators.find();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validators.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/validators.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Validators: () => Validators
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let ValidatorRecords;
module.link("../records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  }

}, 1);
let VotingPowerHistory;
module.link("../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 2);
const Validators = new Mongo.Collection('validators');
Validators.helpers({
  firstSeen() {
    return ValidatorRecords.findOne({
      address: this.address
    });
  },

  history() {
    return VotingPowerHistory.find({
      address: this.address
    }, {
      sort: {
        height: -1
      },
      limit: 50
    }).fetch();
  }

}); // Validators.helpers({
//     uptime(){
//         // console.log(this.address);
//         let lastHundred = ValidatorRecords.find({address:this.address}, {sort:{height:-1}, limit:100}).fetch();
//         console.log(lastHundred);
//         let uptime = 0;
//         for (i in lastHundred){
//             if (lastHundred[i].exists){
//                 uptime+=1;
//             }
//         }
//         return uptime;
//     }
// })
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"voting-power":{"server":{"publications.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/voting-power/server/publications.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"history.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/voting-power/history.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  VotingPowerHistory: () => VotingPowerHistory
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const VotingPowerHistory = new Mongo.Collection('voting_power_history');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"evidences":{"evidences.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/evidences/evidences.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Evidences: () => Evidences
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Evidences = new Mongo.Collection('evidences');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validator-sets":{"validator-sets.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validator-sets/validator-sets.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ValidatorSets: () => ValidatorSets
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const ValidatorSets = new Mongo.Collection('validator_sets');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"startup":{"server":{"create-indexes.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/create-indexes.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Blockscon;
module.link("../../api/blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 0);
let Proposals;
module.link("../../api/proposals/proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 1);
let ValidatorRecords, Analytics, MissedBlocksStats, MissedBlocks, AverageData, AverageValidatorData;
module.link("../../api/records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  },

  MissedBlocks(v) {
    MissedBlocks = v;
  },

  AverageData(v) {
    AverageData = v;
  },

  AverageValidatorData(v) {
    AverageValidatorData = v;
  }

}, 2);
let Transactions;
module.link("../../api/transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 3);
let ValidatorSets;
module.link("../../api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 4);
let Validators;
module.link("../../api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 5);
let VotingPowerHistory;
module.link("../../api/voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 6);
let Evidences;
module.link("../../api/evidences/evidences.js", {
  Evidences(v) {
    Evidences = v;
  }

}, 7);
let CoinStats;
module.link("../../api/coin-stats/coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 8);
let ChainStates;
module.link("../../api/chain/chain.js", {
  ChainStates(v) {
    ChainStates = v;
  }

}, 9);
ChainStates.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
Blockscon.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
Blockscon.rawCollection().createIndex({
  proposerAddress: 1
});
Evidences.rawCollection().createIndex({
  height: -1
});
Proposals.rawCollection().createIndex({
  proposalId: 1
}, {
  unique: true
});
ValidatorRecords.rawCollection().createIndex({
  address: 1,
  height: -1
}, {
  unique: 1
});
ValidatorRecords.rawCollection().createIndex({
  address: 1,
  exists: 1,
  height: -1
});
Analytics.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
MissedBlocks.rawCollection().createIndex({
  proposer: 1,
  voter: 1,
  updatedAt: -1
});
MissedBlocks.rawCollection().createIndex({
  proposer: 1,
  blockHeight: -1
});
MissedBlocks.rawCollection().createIndex({
  voter: 1,
  blockHeight: -1
});
MissedBlocks.rawCollection().createIndex({
  voter: 1,
  proposer: 1,
  blockHeight: -1
}, {
  unique: true
});
MissedBlocksStats.rawCollection().createIndex({
  proposer: 1
});
MissedBlocksStats.rawCollection().createIndex({
  voter: 1
});
MissedBlocksStats.rawCollection().createIndex({
  proposer: 1,
  voter: 1
}, {
  unique: true
});
AverageData.rawCollection().createIndex({
  type: 1,
  createdAt: -1
}, {
  unique: true
});
AverageValidatorData.rawCollection().createIndex({
  proposerAddress: 1,
  createdAt: -1
}, {
  unique: true
}); // Status.rawCollection.createIndex({})

Transactions.rawCollection().createIndex({
  txhash: 1
}, {
  unique: true
});
Transactions.rawCollection().createIndex({
  height: -1
}); // Transactions.rawCollection().createIndex({action:1});

Transactions.rawCollection().createIndex({
  "events.attributes.key": 1
});
Transactions.rawCollection().createIndex({
  "events.attributes.value": 1
});
ValidatorSets.rawCollection().createIndex({
  block_height: -1
});
Validators.rawCollection().createIndex({
  address: 1
}, {
  unique: true,
  partialFilterExpression: {
    address: {
      $exists: true
    }
  }
});
Validators.rawCollection().createIndex({
  consensus_pubkey: 1
}, {
  unique: true
});
Validators.rawCollection().createIndex({
  "pub_key.value": 1
}, {
  unique: true,
  partialFilterExpression: {
    "pub_key.value": {
      $exists: true
    }
  }
});
VotingPowerHistory.rawCollection().createIndex({
  address: 1,
  height: -1
});
VotingPowerHistory.rawCollection().createIndex({
  type: 1
});
CoinStats.rawCollection().createIndex({
  last_updated_at: -1
}, {
  unique: true
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/index.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./util.js");
module.link("./register-api.js");
module.link("./create-indexes.js");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"register-api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/register-api.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("../../api/ledger/server/methods.js");
module.link("../../api/chain/server/methods.js");
module.link("../../api/chain/server/publications.js");
module.link("../../api/blocks/server/methods.js");
module.link("../../api/blocks/server/publications.js");
module.link("../../api/validators/server/methods.js");
module.link("../../api/validators/server/publications.js");
module.link("../../api/records/server/methods.js");
module.link("../../api/records/server/publications.js");
module.link("../../api/proposals/server/methods.js");
module.link("../../api/proposals/server/publications.js");
module.link("../../api/voting-power/server/publications.js");
module.link("../../api/transactions/server/methods.js");
module.link("../../api/transactions/server/publications.js");
module.link("../../api/delegations/server/methods.js");
module.link("../../api/delegations/server/publications.js");
module.link("../../api/status/server/publications.js");
module.link("../../api/accounts/server/methods.js");
module.link("../../api/coin-stats/server/methods.js");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"util.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/util.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let bech32;
module.link("bech32", {
  default(v) {
    bech32 = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let cheerio;
module.link("cheerio", {
  "*"(v) {
    cheerio = v;
  }

}, 2);

// Load future from fibers
var Future = Npm.require("fibers/future"); // Load exec


var exec = Npm.require("child_process").exec;

function toHexString(byteArray) {
  return byteArray.map(function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

Meteor.methods({
  pubkeyToBech32: function (pubkey, prefix) {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
    let buffer = Buffer.alloc(37);
    pubkeyAminoPrefix.copy(buffer, 0);
    Buffer.from(pubkey.value, 'base64').copy(buffer, pubkeyAminoPrefix.length);
    return bech32.encode(prefix, bech32.toWords(buffer));
  },
  bech32ToPubkey: function (pubkey) {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
    let buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
    return buffer.slice(pubkeyAminoPrefix.length).toString('base64');
  },
  getDelegator: function (operatorAddr) {
    let address = bech32.decode(operatorAddr);
    return bech32.encode(Meteor.settings.public.bech32PrefixAccAddr, address.words);
  },
  getKeybaseTeamPic: function (keybaseUrl) {
    let teamPage = HTTP.get(keybaseUrl);

    if (teamPage.statusCode == 200) {
      let page = cheerio.load(teamPage.content);
      return page(".kb-main-card img").attr('src');
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"server":{"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// server/main.js                                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("/imports/startup/server");
// import '/imports/startup/both';
// import moment from 'moment';
// import '/imports/api/blocks/blocks.js';
SYNCING = false;
COUNTMISSEDBLOCKS = false;
COUNTMISSEDBLOCKSSTATS = false;
RPC = "http://54.178.210.145:26657";
LCD = "http://54.178.210.145:80";
timerBlocks = 0;
timerChain = 0;
timerConsensus = 0;
timerProposal = 0;
timerProposalsResults = 0;
timerMissedBlock = 0;
timerDelegation = 0;
timerAggregate = 0;
const DEFAULTSETTINGS = '/default_settings.json';

updateChainStatus = () => {
  Meteor.call('chain.updateStatus', (error, result) => {
    if (error) {
      console.log("updateStatus: " + error, 'server-chain.updateStatus');
    } else {
      console.log("updateStatus: " + result);
    }
  });
};

updateBlock = () => {
  Meteor.call('blocks.blocksUpdate', (error, result) => {
    if (error) {
      console.log("updateBlocks: " + error, 'server-blocks.blocksUpdate');
    } else {
      console.log("updateBlocks: " + result);
    }
  });
};

getConsensusState = () => {
  Meteor.call('chain.getConsensusState', (error, result) => {
    if (error) {
      console.log("get consensus: " + error, 'server-chain.getConsensusState');
    }
  });
};

getProposals = () => {
  Meteor.call('proposals.getProposals', (error, result) => {
    if (error) {
      console.log("get proposal: " + error, 'server-proposals.getProposals');
    }

    if (result) {
      console.log("get proposal: " + result);
    }
  });
};

getProposalsResults = () => {
  Meteor.call('proposals.getProposalResults', (error, result) => {
    if (error) {
      console.log("get proposals result: " + error, 'server-proposals.getProposalResults');
    }

    if (result) {
      console.log("get proposals result: " + result);
    }
  });
};

updateMissedBlocks = () => {
  Meteor.call('ValidatorRecords.calculateMissedBlocks', (error, result) => {
    if (error) {
      console.log("missed blocks error: " + error, 'server-ValidatorRecords.calculateMissedBlocks');
    }

    if (result) {
      console.log("missed blocks ok:" + result);
    }
  });
  /*
      Meteor.call('ValidatorRecords.calculateMissedBlocksStats', (error, result) =>{
          if (error){
              console.log("missed blocks stats error: "+ error)
          }
          if (result){
              console.log("missed blocks stats ok:" + result);
          }
      });
  */
};

getDelegations = () => {
  Meteor.call('delegations.getDelegations', (error, result) => {
    if (error) {
      console.log("get delegations error: " + error, 'server-delegations.getDelegations');
    } else {
      console.log("get delegations ok: " + result);
    }
  });
};

aggregateMinutely = () => {
  // doing something every min
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "m", (error, result) => {
    if (error) {
      console.log("aggregate minutely block time error: " + error, 'server-Analytics.aggregateBlockTimeAndVotingPower');
    } else {
      console.log("aggregate minutely block time ok: " + result);
    }
  });
  Meteor.call('coinStats.getCoinStats', (error, result) => {
    if (error) {
      console.log("get coin stats error: " + error, 'server-coinStats.getCoinStats');
    } else {
      console.log("get coin stats ok: " + result);
    }
  });
};

aggregateHourly = () => {
  // doing something every hour
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "h", (error, result) => {
    if (error) {
      console.log("aggregate hourly block time error: " + error, 'server-Analytics.aggregateBlockTimeAndVotingPower');
    } else {
      console.log("aggregate hourly block time ok: " + result);
    }
  });
};

aggregateDaily = () => {
  // doing somthing every day
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "d", (error, result) => {
    if (error) {
      console.log("aggregate daily block time error: " + error, 'server-Analytics.aggregateBlockTimeAndVotingPower');
    } else {
      console.log("aggregate daily block time ok: " + result);
    }
  });
  Meteor.call('Analytics.aggregateValidatorDailyBlockTime', (error, result) => {
    if (error) {
      console.log("aggregate validators block time error:" + error, 'server-Analytics.aggregateValidatorDailyBlockTime');
    } else {
      console.log("aggregate validators block time ok:" + result);
    }
  });
};

Meteor.startup(function () {
  if (Meteor.isDevelopment) {
    let DEFAULTSETTINGSJSON;
    module.link("../default_settings.json", {
      default(v) {
        DEFAULTSETTINGSJSON = v;
      }

    }, 0);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    Object.keys(DEFAULTSETTINGSJSON).forEach(key => {
      if (Meteor.settings[key] == undefined) {
        console.warn(`CHECK SETTINGS JSON: ${key} is missing from settings`);
        Meteor.settings[key] = {};
      }

      Object.keys(DEFAULTSETTINGSJSON[key]).forEach(param => {
        if (Meteor.settings[key][param] == undefined) {
          console.warn(`CHECK SETTINGS JSON: ${key}.${param} is missing from settings`);
          Meteor.settings[key][param] = DEFAULTSETTINGSJSON[key][param];
        }
      });
    });
  }

  Meteor.call('chain.genesis', (err, result) => {
    if (err) {
      console.log(err);
    }

    if (result) {
      if (Meteor.settings.debug.startTimer) {
        timerConsensus = Meteor.setInterval(function () {
          getConsensusState();
        }, Meteor.settings.params.consensusInterval);
        timerBlocks = Meteor.setInterval(function () {
          updateBlock();
        }, Meteor.settings.params.blockInterval);
        timerChain = Meteor.setInterval(function () {
          updateChainStatus();
        }, Meteor.settings.params.statusInterval);
        timerProposal = Meteor.setInterval(function () {
          getProposals();
        }, Meteor.settings.params.proposalInterval);
        timerProposalsResults = Meteor.setInterval(function () {
          getProposalsResults();
        }, Meteor.settings.params.proposalInterval);
        timerMissedBlock = Meteor.setInterval(function () {
          updateMissedBlocks();
        }, Meteor.settings.params.missedBlocksInterval);
        timerDelegation = Meteor.setInterval(function () {
          getDelegations();
        }, Meteor.settings.params.delegationInterval);
        timerAggregate = Meteor.setInterval(function () {
          let now = new Date();

          if (now.getUTCSeconds() == 0) {
            aggregateMinutely();
          }

          if (now.getUTCMinutes() == 0 && now.getUTCSeconds() == 0) {
            aggregateHourly();
          }

          if (now.getUTCHours() == 0 && now.getUTCMinutes() == 0 && now.getUTCSeconds() == 0) {
            aggregateDaily();
          }
        }, 1000);
      }
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"default_settings.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// default_settings.json                                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "public": {
    "chainName": "Cosmos Testnet",
    "chainId": "cosmoshub-2",
    "gtm": "{Add your Google Tag Manager ID here}",
    "slashingWindow": 10000,
    "uptimeWindow": 250,
    "initialPageSize": 30,
    "bech32PrefixAccAddr": "cosmos",
    "bech32PrefixAccPub": "cosmospub",
    "bech32PrefixValAddr": "cosmosvaloper",
    "bech32PrefixValPub": "cosmosvaloperpub",
    "bech32PrefixConsAddr": "cosmosvalcons",
    "bech32PrefixConsPub": "cosmosvalconspub",
    "stakingDenom": "ATOM",
    "mintingDenom": "uatom",
    "stakingFraction": 1000000,
    "gasPrice": 0.02,
    "coingeckoId": "cosmos"
  },
  "genesisFile": "http://54.178.210.145:26657/genesis",
  "remote": {
    "rpc": "http://54.178.210.145:26657",
    "lcd": "http://54.178.210.145:80"
  },
  "debug": {
    "startTimer": true,
    "readGenesis": true
  },
  "params": {
    "startHeight": 0,
    "defaultBlockTime": 5000,
    "blockInterval": 15000,
    "consensusInterval": 1000,
    "statusInterval": 7500,
    "signingInfoInterval": 1800000,
    "proposalInterval": 5000,
    "missedBlocksInterval": 60000,
    "delegationInterval": 900000
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYWNjb3VudHMvc2VydmVyL21ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2Jsb2Nrcy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYmxvY2tzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2Jsb2Nrcy9ibG9ja3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2NoYWluL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9jaGFpbi9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9jaGFpbi9jaGFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvY29pbi1zdGF0cy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvY29pbi1zdGF0cy9jb2luLXN0YXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvZGVsZWdhdGlvbnMvZGVsZWdhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2xlZGdlci9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcHJvcG9zYWxzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9wcm9wb3NhbHMvc2VydmVyL3B1YmxpY2F0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcHJvcG9zYWxzL3Byb3Bvc2Fscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcmVjb3Jkcy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcmVjb3Jkcy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9yZWNvcmRzL3JlY29yZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3N0YXR1cy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zdGF0dXMvc3RhdHVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS90cmFuc2FjdGlvbnMvc2VydmVyL21ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3RyYW5zYWN0aW9ucy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS92YWxpZGF0b3JzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS92YWxpZGF0b3JzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvdm90aW5nLXBvd2VyL2hpc3RvcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2V2aWRlbmNlcy9ldmlkZW5jZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3ZhbGlkYXRvci1zZXRzL3ZhbGlkYXRvci1zZXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2NyZWF0ZS1pbmRleGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL3JlZ2lzdGVyLWFwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci91dGlsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJtb2R1bGUiLCJsaW5rIiwidiIsIkhUVFAiLCJfIiwiZGVmYXVsdCIsIlZhbGlkYXRvcnMiLCJmZXRjaEZyb21VcmwiLCJ1cmwiLCJyZXMiLCJnZXQiLCJMQ0QiLCJzdGF0dXNDb2RlIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJtZXRob2RzIiwiYWRkcmVzcyIsInVuYmxvY2siLCJhdmFpbGFibGUiLCJyZXNwb25zZSIsImlzVW5kZWZpbmVkIiwiZGF0YSIsIkpTT04iLCJwYXJzZSIsImNvbnRlbnQiLCJpc09iamVjdCIsInJlc3VsdCIsImFjY291bnQiLCJpbmRleE9mIiwidHlwZSIsInZhbHVlIiwiQmFzZVZlc3RpbmdBY2NvdW50IiwiYmFsYW5jZSIsInVuZGVmaW5lZCIsImxlbmd0aCIsImRlbGVnYXRpb25zIiwidW5ib25kaW5nIiwicmV3YXJkcyIsInRvdGFsIiwidmFsaWRhdG9yIiwiZmluZE9uZSIsIiRvciIsIm9wZXJhdG9yX2FkZHJlc3MiLCJkZWxlZ2F0b3JfYWRkcmVzcyIsInZhbF9jb21taXNzaW9uIiwiY29tbWlzc2lvbiIsInNoYXJlcyIsInBhcnNlRmxvYXQiLCJyZWxlZ2F0aW9ucyIsImNvbXBsZXRpb25UaW1lIiwiZm9yRWFjaCIsInJlbGVnYXRpb24iLCJlbnRyaWVzIiwidGltZSIsIkRhdGUiLCJjb21wbGV0aW9uX3RpbWUiLCJyZWRlbGVnYXRpb25Db21wbGV0aW9uVGltZSIsInVuZGVsZWdhdGlvbnMiLCJ1bmJvbmRpbmdDb21wbGV0aW9uVGltZSIsImRlbGVnYXRpb24iLCJpIiwidW5ib25kaW5ncyIsInJlZGVsZWdhdGlvbnMiLCJyZWRlbGVnYXRpb24iLCJ2YWxpZGF0b3JfZHN0X2FkZHJlc3MiLCJjb3VudCIsIlByb21pc2UiLCJCbG9ja3Njb24iLCJDaGFpbiIsIlZhbGlkYXRvclNldHMiLCJWYWxpZGF0b3JSZWNvcmRzIiwiQW5hbHl0aWNzIiwiVlBEaXN0cmlidXRpb25zIiwiVm90aW5nUG93ZXJIaXN0b3J5IiwiVHJhbnNhY3Rpb25zIiwiRXZpZGVuY2VzIiwic2hhMjU2IiwiZ2V0QWRkcmVzcyIsImNoZWVyaW8iLCJnZXRSZW1vdmVkVmFsaWRhdG9ycyIsInByZXZWYWxpZGF0b3JzIiwidmFsaWRhdG9ycyIsInAiLCJzcGxpY2UiLCJnZXRWYWxpZGF0b3JQcm9maWxlVXJsIiwiaWRlbnRpdHkiLCJ0aGVtIiwicGljdHVyZXMiLCJwcmltYXJ5Iiwic3RyaW5naWZ5IiwidGVhbVBhZ2UiLCJwYWdlIiwibG9hZCIsImF0dHIiLCJibG9ja3MiLCJmaW5kIiwicHJvcG9zZXJBZGRyZXNzIiwiZmV0Y2giLCJoZWlnaHRzIiwibWFwIiwiYmxvY2siLCJoZWlnaHQiLCJibG9ja3NTdGF0cyIsIiRpbiIsInRvdGFsQmxvY2tEaWZmIiwiYiIsInRpbWVEaWZmIiwiY29sbGVjdGlvbiIsInJhd0NvbGxlY3Rpb24iLCJwaXBlbGluZSIsIiRtYXRjaCIsIiRzb3J0IiwiJGxpbWl0Iiwic2V0dGluZ3MiLCJwdWJsaWMiLCJ1cHRpbWVXaW5kb3ciLCIkdW53aW5kIiwiJGdyb3VwIiwiJGNvbmQiLCIkZXEiLCJhd2FpdCIsImFnZ3JlZ2F0ZSIsInRvQXJyYXkiLCJSUEMiLCJzdGF0dXMiLCJzeW5jX2luZm8iLCJsYXRlc3RfYmxvY2tfaGVpZ2h0IiwiY3VyckhlaWdodCIsInNvcnQiLCJsaW1pdCIsInN0YXJ0SGVpZ2h0IiwicGFyYW1zIiwiU1lOQ0lORyIsInVudGlsIiwiY2FsbCIsImN1cnIiLCJ2YWxpZGF0b3JTZXQiLCJjb25zZW5zdXNfcHVia2V5IiwidG90YWxWYWxpZGF0b3JzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0QmxvY2tUaW1lIiwiYW5hbHl0aWNzRGF0YSIsImJ1bGtWYWxpZGF0b3JzIiwiaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCIsImJ1bGtWYWxpZGF0b3JSZWNvcmRzIiwiYnVsa1ZQSGlzdG9yeSIsImJ1bGtUcmFuc2F0aW9ucyIsInN0YXJ0R2V0SGVpZ2h0VGltZSIsImJsb2NrRGF0YSIsImhhc2giLCJibG9ja19tZXRhIiwiYmxvY2tfaWQiLCJ0cmFuc051bSIsImhlYWRlciIsIm51bV90eHMiLCJsYXN0QmxvY2tIYXNoIiwibGFzdF9ibG9ja19pZCIsInByb3Bvc2VyX2FkZHJlc3MiLCJwcmVjb21taXRzIiwibGFzdF9jb21taXQiLCJwdXNoIiwidmFsaWRhdG9yX2FkZHJlc3MiLCJ0eHMiLCJ0IiwiQnVmZmVyIiwiZnJvbSIsImVyciIsImV2aWRlbmNlIiwiaW5zZXJ0IiwicHJlY29tbWl0c0NvdW50IiwiZW5kR2V0SGVpZ2h0VGltZSIsInN0YXJ0R2V0VmFsaWRhdG9yc1RpbWUiLCJibG9ja19oZWlnaHQiLCJwYXJzZUludCIsInZhbGlkYXRvcnNDb3VudCIsInN0YXJ0QmxvY2tJbnNlcnRUaW1lIiwiZW5kQmxvY2tJbnNlcnRUaW1lIiwiZXhpc3RpbmdWYWxpZGF0b3JzIiwiJGV4aXN0cyIsInJlY29yZCIsImV4aXN0cyIsInZvdGluZ19wb3dlciIsImoiLCJudW1CbG9ja3MiLCJ1cHRpbWUiLCJiYXNlIiwidXBzZXJ0IiwidXBkYXRlT25lIiwiJHNldCIsImxhc3RTZWVuIiwiY2hhaW5TdGF0dXMiLCJjaGFpbklkIiwiY2hhaW5faWQiLCJsYXN0U3luY2VkVGltZSIsImJsb2NrVGltZSIsImRlZmF1bHRCbG9ja1RpbWUiLCJkYXRlTGF0ZXN0IiwiZGF0ZUxhc3QiLCJNYXRoIiwiYWJzIiwiZ2V0VGltZSIsImVuZEdldFZhbGlkYXRvcnNUaW1lIiwidXBkYXRlIiwiYXZlcmFnZUJsb2NrVGltZSIsInN0YXJ0RmluZFZhbGlkYXRvcnNOYW1lVGltZSIsInByb3Bvc2VyX3ByaW9yaXR5IiwidmFsRXhpc3QiLCJwdWJfa2V5IiwiYWNjcHViIiwiYmVjaDMyUHJlZml4QWNjUHViIiwib3BlcmF0b3JfcHVia2V5IiwiYmVjaDMyUHJlZml4VmFsUHViIiwiYmVjaDMyUHJlZml4Q29uc1B1YiIsInZhbGlkYXRvckRhdGEiLCJkZXNjcmlwdGlvbiIsInByb2ZpbGVfdXJsIiwiamFpbGVkIiwibWluX3NlbGZfZGVsZWdhdGlvbiIsInRva2VucyIsImRlbGVnYXRvcl9zaGFyZXMiLCJib25kX2hlaWdodCIsImJvbmRfaW50cmFfdHhfY291bnRlciIsInVuYm9uZGluZ19oZWlnaHQiLCJ1bmJvbmRpbmdfdGltZSIsInNlbGZfZGVsZWdhdGlvbiIsInByZXZfdm90aW5nX3Bvd2VyIiwiYmxvY2tfdGltZSIsInNlbGZEZWxlZ2F0aW9uIiwicHJldlZvdGluZ1Bvd2VyIiwiY2hhbmdlVHlwZSIsImNoYW5nZURhdGEiLCJyZW1vdmVkVmFsaWRhdG9ycyIsInIiLCJkYlZhbGlkYXRvcnMiLCJmaWVsZHMiLCJjb25QdWJLZXkiLCJwcm9maWxlVXJsIiwiZW5kRmluZFZhbGlkYXRvcnNOYW1lVGltZSIsInN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lIiwiZW5kQW5hbHl0aWNzSW5zZXJ0VGltZSIsInN0YXJ0VlVwVGltZSIsImV4ZWN1dGUiLCJlbmRWVXBUaW1lIiwic3RhcnRWUlRpbWUiLCJlbmRWUlRpbWUiLCJhY3RpdmVWYWxpZGF0b3JzIiwibnVtVG9wVHdlbnR5IiwiY2VpbCIsIm51bUJvdHRvbUVpZ2h0eSIsInRvcFR3ZW50eVBvd2VyIiwiYm90dG9tRWlnaHR5UG93ZXIiLCJudW1Ub3BUaGlydHlGb3VyIiwibnVtQm90dG9tU2l4dHlTaXgiLCJ0b3BUaGlydHlGb3VyUGVyY2VudCIsImJvdHRvbVNpeHR5U2l4UGVyY2VudCIsInZwRGlzdCIsIm51bVZhbGlkYXRvcnMiLCJ0b3RhbFZvdGluZ1Bvd2VyIiwiY3JlYXRlQXQiLCJlbmRCbG9ja1RpbWUiLCJsYXN0QmxvY2tzU3luY2VkVGltZSIsInNvcnRfZmllbGQiLCJzb3J0X29yZGVyIiwiY291bnRBbGwiLCJwYWdpbmF0aW9uIiwidG90YWxfcGFnZSIsInJvdW5kIiwidG90YWxfcmVjb3JkIiwiY3VycmVudF9wYWdlIiwidG8iLCJvZmZzZXQiLCJza2lwIiwicHJvcG9zZXIiLCJ0cmFuc2FjdGlvbnMiLCJwdWJsaXNoQ29tcG9zaXRlIiwiY2hpbGRyZW4iLCJleHBvcnQiLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJoZWxwZXJzIiwibW9tZW50IiwiQ2hhaW5TdGF0ZXMiLCJmaW5kVm90aW5nUG93ZXIiLCJnZW5WYWxpZGF0b3JzIiwicG93ZXIiLCJjb25zZW5zdXMiLCJyb3VuZF9zdGF0ZSIsInN0ZXAiLCJ2b3RlZFBvd2VyIiwidm90ZXMiLCJwcmV2b3Rlc19iaXRfYXJyYXkiLCJzcGxpdCIsInZvdGluZ0hlaWdodCIsInZvdGluZ1JvdW5kIiwidm90aW5nU3RlcCIsInByZXZvdGVzIiwiY2hhaW4iLCJub2RlX2luZm8iLCJuZXR3b3JrIiwibGF0ZXN0QmxvY2tIZWlnaHQiLCJsYXRlc3RCbG9ja1RpbWUiLCJsYXRlc3RfYmxvY2tfdGltZSIsImxhdGVzdFN0YXRlIiwiYWN0aXZlVlAiLCJhY3RpdmVWb3RpbmdQb3dlciIsImNoYWluU3RhdGVzIiwiYm9uZGluZyIsImJvbmRlZFRva2VucyIsImJvbmRlZF90b2tlbnMiLCJub3RCb25kZWRUb2tlbnMiLCJub3RfYm9uZGVkX3Rva2VucyIsInBvb2wiLCJjb21tdW5pdHlQb29sIiwiYW1vdW50IiwiZGVub20iLCJpbmZsYXRpb24iLCJwcm92aXNpb25zIiwiYW5udWFsUHJvdmlzaW9ucyIsImNyZWF0ZWQiLCJyZWFkR2VuZXNpcyIsImdlbmVzaXNGaWxlIiwiZ2VuZXNpcyIsImRpc3RyIiwiYXBwX3N0YXRlIiwiZGlzdHJpYnV0aW9uIiwiY2hhaW5QYXJhbXMiLCJnZW5lc2lzVGltZSIsImdlbmVzaXNfdGltZSIsImNvbnNlbnN1c1BhcmFtcyIsImNvbnNlbnN1c19wYXJhbXMiLCJhdXRoIiwiYmFuayIsInN0YWtpbmciLCJtaW50IiwiY29tbXVuaXR5VGF4IiwiY29tbXVuaXR5X3RheCIsImJhc2VQcm9wb3NlclJld2FyZCIsImJhc2VfcHJvcG9zZXJfcmV3YXJkIiwiYm9udXNQcm9wb3NlclJld2FyZCIsImJvbnVzX3Byb3Bvc2VyX3Jld2FyZCIsIndpdGhkcmF3QWRkckVuYWJsZWQiLCJ3aXRoZHJhd19hZGRyX2VuYWJsZWQiLCJnb3YiLCJzdGFydGluZ1Byb3Bvc2FsSWQiLCJzdGFydGluZ19wcm9wb3NhbF9pZCIsImRlcG9zaXRQYXJhbXMiLCJkZXBvc2l0X3BhcmFtcyIsInZvdGluZ1BhcmFtcyIsInZvdGluZ19wYXJhbXMiLCJ0YWxseVBhcmFtcyIsInRhbGx5X3BhcmFtcyIsInNsYXNoaW5nIiwic3VwcGx5IiwiY3Jpc2lzIiwiZ2VudXRpbCIsImdlbnR4cyIsIm1zZyIsIm0iLCJwdWJrZXkiLCJmbG9vciIsInN0YWtpbmdGcmFjdGlvbiIsInB1YmtleVZhbHVlIiwiZ2VuVmFsaWRhdG9yc1NldCIsInF1ZXJ5IiwiX2RhdGEiLCJzdWJ0cmFjdCIsIiRsdCIsInRvRGF0ZSIsIiRndCIsImZvcm1hdCIsImRhdGFfMjRoIiwiZWFjaCIsImZpcnN0IiwiZmlsdGVyIiwidmFsIiwiQ29pblN0YXRzIiwicHVibGlzaCIsImxhc3RfdXBkYXRlZF9hdCIsImNvaW5JZCIsImNvaW5nZWNrb0lkIiwibm93Iiwic2V0TWludXRlcyIsInBvdyIsInVzZCIsInVuaXgiLCJEZWxlZ2F0aW9ucyIsImNvbmNhdCIsImNyZWF0ZWRBdCIsInR4SW5mbyIsInRpbWVzdGFtcCIsInBvc3QiLCJjb2RlIiwiRXJyb3IiLCJyYXdfbG9nIiwibWVzc2FnZSIsInR4aGFzaCIsImJvZHkiLCJwYXRoIiwidHhNc2ciLCJhZGp1c3RtZW50IiwiZ2FzX2VzdGltYXRlIiwiUHJvcG9zYWxzIiwicHJvcG9zYWxzIiwiZmluaXNoZWRQcm9wb3NhbElkcyIsIlNldCIsInByb3Bvc2FsSWQiLCJwcm9wb3NhbElkcyIsImJ1bGtQcm9wb3NhbHMiLCJwcm9wb3NhbCIsInByb3Bvc2FsX2lkIiwiaGFzIiwiJG5pbiIsInByb3Bvc2FsX3N0YXR1cyIsImRlcG9zaXRzIiwiZ2V0Vm90ZURldGFpbCIsInRhbGx5IiwidXBkYXRlZEF0IiwiaWQiLCJ2b3RlcnMiLCJ2b3RlIiwidm90ZXIiLCJ2b3RpbmdQb3dlck1hcCIsInZhbGlkYXRvckFkZHJlc3NNYXAiLCJtb25pa2VyIiwiZGVsZWdhdG9yU2hhcmVzIiwiZGVkdWN0ZWRTaGFyZXMiLCJ2b3RpbmdQb3dlciIsImNoZWNrIiwiTnVtYmVyIiwiQXZlcmFnZURhdGEiLCJBdmVyYWdlVmFsaWRhdG9yRGF0YSIsIlN0YXR1cyIsIk1pc3NlZEJsb2Nrc1N0YXRzIiwiTWlzc2VkQmxvY2tzIiwiQlVMS1VQREFURU1BWFNJWkUiLCJnZXRCbG9ja1N0YXRzIiwibGF0ZXN0SGVpZ2h0IiwiYmxvY2tTdGF0cyIsImNvbmQiLCIkYW5kIiwiJGx0ZSIsIm9wdGlvbnMiLCJhc3NpZ24iLCJnZXRQcmV2aW91c1JlY29yZCIsInZvdGVyQWRkcmVzcyIsInByZXZpb3VzUmVjb3JkIiwiYmxvY2tIZWlnaHQiLCJsYXN0VXBkYXRlZEhlaWdodCIsInByZXZTdGF0cyIsInBpY2siLCJtaXNzQ291bnQiLCJ0b3RhbENvdW50IiwiQ09VTlRNSVNTRURCTE9DS1MiLCJzdGFydFRpbWUiLCJleHBsb3JlclN0YXR1cyIsImxhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja0hlaWdodCIsIm1pbiIsImJ1bGtNaXNzZWRTdGF0cyIsImluaXRpYWxpemVPcmRlcmVkQnVsa09wIiwidmFsaWRhdG9yc01hcCIsInByb3Bvc2VyVm90ZXJTdGF0cyIsInZvdGVkVmFsaWRhdG9ycyIsInZhbGlkYXRvclNldHMiLCJ2b3RlZFZvdGluZ1Bvd2VyIiwiYWN0aXZlVmFsaWRhdG9yIiwiY3VycmVudFZhbGlkYXRvciIsInNldCIsIm4iLCJzdGF0cyIsImNsaWVudCIsIl9kcml2ZXIiLCJtb25nbyIsImJ1bGtQcm9taXNlIiwidGhlbiIsImJpbmRFbnZpcm9ubWVudCIsIm5JbnNlcnRlZCIsIm5VcHNlcnRlZCIsIm5Nb2RpZmllZCIsImxhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja1RpbWUiLCJDT1VOVE1JU1NFREJMT0NLU1NUQVRTIiwibGFzdE1pc3NlZEJsb2NrSGVpZ2h0IiwibWlzc2VkUmVjb3JkcyIsImNvdW50cyIsImV4aXN0aW5nUmVjb3JkIiwibGFzdE1pc3NlZEJsb2NrVGltZSIsImF2ZXJhZ2VWb3RpbmdQb3dlciIsImFuYWx5dGljcyIsImxhc3RNaW51dGVWb3RpbmdQb3dlciIsImxhc3RNaW51dGVCbG9ja1RpbWUiLCJsYXN0SG91clZvdGluZ1Bvd2VyIiwibGFzdEhvdXJCbG9ja1RpbWUiLCJsYXN0RGF5Vm90aW5nUG93ZXIiLCJsYXN0RGF5QmxvY2tUaW1lIiwiYmxvY2tIZWlnaHRzIiwiYSIsIm51bSIsImNvbmRpdGlvbnMiLCJwcm9wb3Nlck1vbmlrZXIiLCJ2b3Rlck1vbmlrZXIiLCJBZGRyZXNzTGVuZ3RoIiwidG9VcHBlckNhc2UiLCJ0eCIsInR4SWQiLCJpbmNsdWRlcyIsImJlY2gzMlByZWZpeFZhbEFkZHIiLCJiZWNoMzJQcmVmaXhBY2NBZGRyIiwidmFsaWRhdG9yQWRkcmVzcyIsImRlbGVnYXRvckFkZHJlc3MiLCIkZWxlbU1hdGNoIiwibGFzdENoYWluU3RhdHMiLCJkZWxlZ2F0b3JzIiwibWlzc19ibG9ja3MiLCJwcm9wb3NlZF9ibG9ja3MiLCJwb3dlcl9ldmVudHMiLCJwb3dlcl9oaXN0b3J5IiwiamFpbGVkX3ZhbHVlIiwidG90YWxfdmFsaWRhdG9yX251bSIsInVuamFpbGVkX3ZhbGlkYXRvcl9udW0iLCJkaXJlY3Rpb24iLCJmaXJzdFNlZW4iLCJoaXN0b3J5IiwiY3JlYXRlSW5kZXgiLCJ1bmlxdWUiLCJwYXJ0aWFsRmlsdGVyRXhwcmVzc2lvbiIsImJlY2gzMiIsIkZ1dHVyZSIsIk5wbSIsInJlcXVpcmUiLCJleGVjIiwidG9IZXhTdHJpbmciLCJieXRlQXJyYXkiLCJieXRlIiwidG9TdHJpbmciLCJzbGljZSIsImpvaW4iLCJwdWJrZXlUb0JlY2gzMiIsInByZWZpeCIsInB1YmtleUFtaW5vUHJlZml4IiwiYnVmZmVyIiwiYWxsb2MiLCJjb3B5IiwiZW5jb2RlIiwidG9Xb3JkcyIsImJlY2gzMlRvUHVia2V5IiwiZnJvbVdvcmRzIiwiZGVjb2RlIiwid29yZHMiLCJnZXREZWxlZ2F0b3IiLCJvcGVyYXRvckFkZHIiLCJnZXRLZXliYXNlVGVhbVBpYyIsImtleWJhc2VVcmwiLCJyZW1vdGUiLCJycGMiLCJsY2QiLCJ0aW1lckJsb2NrcyIsInRpbWVyQ2hhaW4iLCJ0aW1lckNvbnNlbnN1cyIsInRpbWVyUHJvcG9zYWwiLCJ0aW1lclByb3Bvc2Fsc1Jlc3VsdHMiLCJ0aW1lck1pc3NlZEJsb2NrIiwidGltZXJEZWxlZ2F0aW9uIiwidGltZXJBZ2dyZWdhdGUiLCJERUZBVUxUU0VUVElOR1MiLCJ1cGRhdGVDaGFpblN0YXR1cyIsImVycm9yIiwidXBkYXRlQmxvY2siLCJnZXRDb25zZW5zdXNTdGF0ZSIsImdldFByb3Bvc2FscyIsImdldFByb3Bvc2Fsc1Jlc3VsdHMiLCJ1cGRhdGVNaXNzZWRCbG9ja3MiLCJnZXREZWxlZ2F0aW9ucyIsImFnZ3JlZ2F0ZU1pbnV0ZWx5IiwiYWdncmVnYXRlSG91cmx5IiwiYWdncmVnYXRlRGFpbHkiLCJzdGFydHVwIiwiaXNEZXZlbG9wbWVudCIsIkRFRkFVTFRTRVRUSU5HU0pTT04iLCJwcm9jZXNzIiwiZW52IiwiTk9ERV9UTFNfUkVKRUNUX1VOQVVUSE9SSVpFRCIsImtleSIsIndhcm4iLCJwYXJhbSIsImRlYnVnIiwic3RhcnRUaW1lciIsInNldEludGVydmFsIiwiY29uc2Vuc3VzSW50ZXJ2YWwiLCJibG9ja0ludGVydmFsIiwic3RhdHVzSW50ZXJ2YWwiLCJwcm9wb3NhbEludGVydmFsIiwibWlzc2VkQmxvY2tzSW50ZXJ2YWwiLCJkZWxlZ2F0aW9uSW50ZXJ2YWwiLCJnZXRVVENTZWNvbmRzIiwiZ2V0VVRDTWludXRlcyIsImdldFVUQ0hvdXJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsTUFBTSxD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RmtCLEVBRWhCNWpCLE1BQU0sQ0FBQ21ILFFBQVAsQ0FBZ0JrQixNQUFoQixDQUF1QjRjLG9CQUZQLENBQW5CO0FBSUE5Qix1QkFBZSxHQUFHbmpCLE1BQU0sQ0FBQzRrQixXQUFQLENBQW1CLFlBQVU7QUFDM0NmLHdCQUFjO0FBQ2pCLFNBRmlCLEVBRWY3akIsTUFBTSxDQUFDbUgsUUFBUCxDQUFnQmtCLE1BQWhCLENBQXVCNmMsa0JBRlIsQ0FBbEI7QUFJQTlCLHNCQUFjLEdBQUdwakIsTUFBTSxDQUFDNGtCLFdBQVAsQ0FBbUIsWUFBVTtBQUMxQyxjQUFJN00sR0FBRyxHQUFHLElBQUl2VSxJQUFKLEVBQVY7O0FBQ0EsY0FBS3VVLEdBQUcsQ0FBQ29OLGFBQUosTUFBdUIsQ0FBNUIsRUFBK0I7QUFDM0JyQiw2QkFBaUI7QUFDcEI7O0FBRUQsY0FBSy9MLEdBQUcsQ0FBQ3FOLGFBQUosTUFBdUIsQ0FBeEIsSUFBK0JyTixHQUFHLENBQUNvTixhQUFKLE1BQXVCLENBQTFELEVBQTZEO0FBQ3pEcEIsMkJBQWU7QUFDbEI7O0FBRUQsY0FBS2hNLEdBQUcsQ0FBQ3NOLFdBQUosTUFBcUIsQ0FBdEIsSUFBNkJ0TixHQUFHLENBQUNxTixhQUFKLE1BQXVCLENBQXBELElBQTJEck4sR0FBRyxDQUFDb04sYUFBSixNQUF1QixDQUF0RixFQUF5RjtBQUNyRm5CLDBCQUFjO0FBQ2pCO0FBQ0osU0FiZ0IsRUFhZCxJQWJjLENBQWpCO0FBY0g7QUFDSjtBQUNKLEdBbEREO0FBb0RILENBdEVELEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnL2ltcG9ydHMvYXBpL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5jb25zdCBmZXRjaEZyb21VcmwgPSAodXJsKSA9PiB7XG4gICAgdHJ5e1xuICAgICAgICBsZXQgcmVzID0gSFRUUC5nZXQoTENEICsgdXJsKTtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH07XG4gICAgfVxuICAgIGNhdGNoIChlKXtcbiAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYWNjb3VudHMuZmV0Y2hGcm9tVWxyJyk7XG4gICAgfVxufVxuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ2FjY291bnRzLmdldEFjY291bnREZXRhaWwnOiBmdW5jdGlvbihhZGRyZXNzKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBMQ0QgKyAnL2F1dGgvYWNjb3VudHMvJysgYWRkcmVzcztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IGF2YWlsYWJsZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBfLmlzVW5kZWZpbmVkKGF2YWlsYWJsZS5kYXRhKSA/IEpTT04ucGFyc2UoYXZhaWxhYmxlLmNvbnRlbnQpIDogYXZhaWxhYmxlLmRhdGE7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBfLmlzT2JqZWN0KHJlc3BvbnNlKSAmJiByZXNwb25zZSAhPSBudWxsICYmICFfLmlzVW5kZWZpbmVkKHJlc3BvbnNlLnJlc3VsdCkgPyByZXNwb25zZS5yZXN1bHQgOiByZXNwb25zZTtcbiAgICAgICAgICAgICAgICBsZXQgYWNjb3VudDtcbiAgICAgICAgICAgICAgICBpZiAoWydhdXRoL0FjY291bnQnLCAnY29zbW9zLXNkay9BY2NvdW50J10uaW5kZXhPZihyZXNwb25zZS50eXBlKSA+PSAwKVxuICAgICAgICAgICAgICAgICAgICBhY2NvdW50ID0gcmVzcG9uc2UudmFsdWU7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoWydhdXRoL0RlbGF5ZWRWZXN0aW5nQWNjb3VudCcsICdhdXRoL0NvbnRpbnVvdXNWZXN0aW5nQWNjb3VudCcsICdjb3Ntb3Mtc2RrL0RlbGF5ZWRWZXN0aW5nQWNjb3VudCcsICdjb3Ntb3Mtc2RrL0NvbnRpbnVvdXNWZXN0aW5nQWNjb3VudCddLmluZGV4T2YocmVzcG9uc2UudHlwZSkgPj0gMCApXG4gICAgICAgICAgICAgICAgICAgIGFjY291bnQgPSByZXNwb25zZS52YWx1ZS5CYXNlVmVzdGluZ0FjY291bnQ7XG4gICAgICAgICAgICAgICAgaWYgKGFjY291bnQgJiYgXy5nZXQoYWNjb3VudCwgJ0Jhc2VBY2NvdW50LmFjY291bnRfbnVtYmVyJywgbnVsbCkgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFjY291bnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYWNjb3VudHMuZ2V0QWNjb3VudERldGFpbCcpXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdhY2NvdW50cy5nZXRCYWxhbmNlJzogZnVuY3Rpb24oYWRkcmVzcyl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgYmFsYW5jZSA9IHt9XG5cbiAgICAgICAgLy8gZ2V0IGF2YWlsYWJsZSBhdG9tc1xuICAgICAgICBsZXQgdXJsID0gTENEICsgJy9iYW5rL2JhbGFuY2VzLycrIGFkZHJlc3M7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICBiYWxhbmNlLmF2YWlsYWJsZSA9IHR5cGVvZiByZXNwb25zZSA9PSAnb2JqZWN0JyAmJiByZXNwb25zZSAhPSBudWxsICYmIHR5cGVvZiByZXNwb25zZS5yZXN1bHQgIT0gdW5kZWZpbmVkID8gcmVzcG9uc2UucmVzdWx0IDogcmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgaWYgKGJhbGFuY2UuYXZhaWxhYmxlICYmIGJhbGFuY2UuYXZhaWxhYmxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgIGJhbGFuY2UuYXZhaWxhYmxlID0gYmFsYW5jZS5hdmFpbGFibGVbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYWNjb3VudHMuZ2V0QmFsYW5jZTEnKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IGRlbGVnYXRlZCBhbW5vdW50c1xuICAgICAgICB1cmwgPSBMQ0QgKyAnL3N0YWtpbmcvZGVsZWdhdG9ycy8nK2FkZHJlc3MrJy9kZWxlZ2F0aW9ucyc7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCBkZWxlZ2F0aW9ucyA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoZGVsZWdhdGlvbnMuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIGJhbGFuY2UuZGVsZWdhdGlvbnMgPSBKU09OLnBhcnNlKGRlbGVnYXRpb25zLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5hY2NvdW50cy5nZXRCYWxhbmNlMicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGdldCB1bmJvbmRpbmdcbiAgICAgICAgdXJsID0gTENEICsgJy9zdGFraW5nL2RlbGVnYXRvcnMvJythZGRyZXNzKycvdW5ib25kaW5nX2RlbGVnYXRpb25zJztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IHVuYm9uZGluZyA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAodW5ib25kaW5nLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICBiYWxhbmNlLnVuYm9uZGluZyA9IEpTT04ucGFyc2UodW5ib25kaW5nLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5hY2NvdW50cy5nZXRCYWxhbmNlMycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IHJld2FyZHNcbiAgICAgICAgdXJsID0gTENEICsgJy9kaXN0cmlidXRpb24vZGVsZWdhdG9ycy8nK2FkZHJlc3MrJy9yZXdhcmRzJztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IHJld2FyZHMgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKHJld2FyZHMuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIGJhbGFuY2UucmV3YXJkcyA9IEpTT04ucGFyc2UocmV3YXJkcy5jb250ZW50KS5yZXN1bHQudG90YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYWNjb3VudHMuZ2V0QmFsYW5jZTQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCBjb21taXNzaW9uXG4gICAgICAgIGxldCB2YWxpZGF0b3IgPSBWYWxpZGF0b3JzLmZpbmRPbmUoXG4gICAgICAgICAgICB7JG9yOiBbe29wZXJhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtkZWxlZ2F0b3JfYWRkcmVzczphZGRyZXNzfSwge2FkZHJlc3M6YWRkcmVzc31dfSlcbiAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgbGV0IHVybCA9IExDRCArICcvZGlzdHJpYnV0aW9uL3ZhbGlkYXRvcnMvJyArIHZhbGlkYXRvci5vcGVyYXRvcl9hZGRyZXNzO1xuICAgICAgICAgICAgYmFsYW5jZS5vcGVyYXRvcl9hZGRyZXNzID0gdmFsaWRhdG9yLm9wZXJhdG9yX2FkZHJlc3M7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCByZXdhcmRzID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICBpZiAocmV3YXJkcy5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gSlNPTi5wYXJzZShyZXdhcmRzLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQudmFsX2NvbW1pc3Npb24gJiYgY29udGVudC52YWxfY29tbWlzc2lvbi5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgYmFsYW5jZS5jb21taXNzaW9uID0gY29udGVudC52YWxfY29tbWlzc2lvblswXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5hY2NvdW50cy5nZXRCYWxhbmNlNScpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmFsYW5jZTtcbiAgICB9LFxuICAgICdhY2NvdW50cy5nZXREZWxlZ2F0aW9uJyhhZGRyZXNzLCB2YWxpZGF0b3Ipe1xuICAgICAgICBsZXQgdXJsID0gYC9zdGFraW5nL2RlbGVnYXRvcnMvJHthZGRyZXNzfS9kZWxlZ2F0aW9ucy8ke3ZhbGlkYXRvcn1gO1xuICAgICAgICBsZXQgZGVsZWdhdGlvbnMgPSBmZXRjaEZyb21VcmwodXJsKTtcbiAgICAgICAgZGVsZWdhdGlvbnMgPSBkZWxlZ2F0aW9ucyAmJiBkZWxlZ2F0aW9ucy5kYXRhLnJlc3VsdDtcbiAgICAgICAgaWYgKGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLnNoYXJlcylcbiAgICAgICAgICAgIGRlbGVnYXRpb25zLnNoYXJlcyA9IHBhcnNlRmxvYXQoZGVsZWdhdGlvbnMuc2hhcmVzKTtcblxuICAgICAgICB1cmwgPSBgL3N0YWtpbmcvcmVkZWxlZ2F0aW9ucz9kZWxlZ2F0b3I9JHthZGRyZXNzfSZ2YWxpZGF0b3JfdG89JHt2YWxpZGF0b3J9YDtcbiAgICAgICAgbGV0IHJlbGVnYXRpb25zID0gZmV0Y2hGcm9tVXJsKHVybCk7XG4gICAgICAgIHJlbGVnYXRpb25zID0gcmVsZWdhdGlvbnMgJiYgcmVsZWdhdGlvbnMuZGF0YS5yZXN1bHQ7XG4gICAgICAgIGxldCBjb21wbGV0aW9uVGltZTtcbiAgICAgICAgaWYgKHJlbGVnYXRpb25zKSB7XG4gICAgICAgICAgICByZWxlZ2F0aW9ucy5mb3JFYWNoKChyZWxlZ2F0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGVudHJpZXMgPSByZWxlZ2F0aW9uLmVudHJpZXNcbiAgICAgICAgICAgICAgICBsZXQgdGltZSA9IG5ldyBEYXRlKGVudHJpZXNbZW50cmllcy5sZW5ndGgtMV0uY29tcGxldGlvbl90aW1lKVxuICAgICAgICAgICAgICAgIGlmICghY29tcGxldGlvblRpbWUgfHwgdGltZSA+IGNvbXBsZXRpb25UaW1lKVxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uVGltZSA9IHRpbWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBkZWxlZ2F0aW9ucy5yZWRlbGVnYXRpb25Db21wbGV0aW9uVGltZSA9IGNvbXBsZXRpb25UaW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdXJsID0gYC9zdGFraW5nL2RlbGVnYXRvcnMvJHthZGRyZXNzfS91bmJvbmRpbmdfZGVsZWdhdGlvbnMvJHt2YWxpZGF0b3J9YDtcbiAgICAgICAgbGV0IHVuZGVsZWdhdGlvbnMgPSBmZXRjaEZyb21VcmwodXJsKTtcbiAgICAgICAgdW5kZWxlZ2F0aW9ucyA9IHVuZGVsZWdhdGlvbnMgJiYgdW5kZWxlZ2F0aW9ucy5kYXRhLnJlc3VsdDtcbiAgICAgICAgaWYgKHVuZGVsZWdhdGlvbnMpIHtcbiAgICAgICAgICAgIGRlbGVnYXRpb25zLnVuYm9uZGluZyA9IHVuZGVsZWdhdGlvbnMuZW50cmllcy5sZW5ndGg7XG4gICAgICAgICAgICBkZWxlZ2F0aW9ucy51bmJvbmRpbmdDb21wbGV0aW9uVGltZSA9IHVuZGVsZWdhdGlvbnMuZW50cmllc1swXS5jb21wbGV0aW9uX3RpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlbGVnYXRpb25zO1xuICAgIH0sXG4gICAgJ2FjY291bnRzLmdldEFsbERlbGVnYXRpb25zJyhhZGRyZXNzKXtcbiAgICAgICAgbGV0IHVybCA9IExDRCArICcvc3Rha2luZy9kZWxlZ2F0b3JzLycrYWRkcmVzcysnL2RlbGVnYXRpb25zJztcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBsZXQgZGVsZWdhdGlvbnMgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKGRlbGVnYXRpb25zLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICBkZWxlZ2F0aW9ucyA9IEpTT04ucGFyc2UoZGVsZWdhdGlvbnMuY29udGVudCkucmVzdWx0O1xuICAgICAgICAgICAgICAgIGlmIChkZWxlZ2F0aW9ucyAmJiBkZWxlZ2F0aW9ucy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZWdhdGlvbnMuZm9yRWFjaCgoZGVsZWdhdGlvbiwgaSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbGVnYXRpb25zW2ldICYmIGRlbGVnYXRpb25zW2ldLnNoYXJlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0aW9uc1tpXS5zaGFyZXMgPSBwYXJzZUZsb2F0KGRlbGVnYXRpb25zW2ldLnNoYXJlcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGVnYXRpb25zO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5hY2NvdW50cy5nZXRBbGxEZWxlZ2F0aW9ucycpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnYWNjb3VudHMuZ2V0QWxsVW5ib25kaW5ncycoYWRkcmVzcyl7XG4gICAgICAgIGxldCB1cmwgPSBMQ0QgKyAnL3N0YWtpbmcvZGVsZWdhdG9ycy8nK2FkZHJlc3MrJy91bmJvbmRpbmdfZGVsZWdhdGlvbnMnO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCB1bmJvbmRpbmdzID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGlmICh1bmJvbmRpbmdzLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICB1bmJvbmRpbmdzID0gSlNPTi5wYXJzZSh1bmJvbmRpbmdzLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5ib25kaW5ncztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYWNjb3VudHMuZ2V0QWxsVW5ib25kaW5ncycpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnYWNjb3VudHMuZ2V0QWxsUmVkZWxlZ2F0aW9ucycoYWRkcmVzcywgdmFsaWRhdG9yKXtcbiAgICAgICAgbGV0IHVybCA9IGAvc3Rha2luZy9yZWRlbGVnYXRpb25zP2RlbGVnYXRvcj0ke2FkZHJlc3N9JnZhbGlkYXRvcl9mcm9tPSR7dmFsaWRhdG9yfWA7XG4gICAgICAgIGxldCByZXN1bHQgPSBmZXRjaEZyb21VcmwodXJsKTtcbiAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgbGV0IHJlZGVsZWdhdGlvbnMgPSB7fVxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaCgocmVkZWxlZ2F0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGVudHJpZXMgPSByZWRlbGVnYXRpb24uZW50cmllcztcbiAgICAgICAgICAgICAgICByZWRlbGVnYXRpb25zW3JlZGVsZWdhdGlvbi52YWxpZGF0b3JfZHN0X2FkZHJlc3NdID0ge1xuICAgICAgICAgICAgICAgICAgICBjb3VudDogZW50cmllcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb25UaW1lOiBlbnRyaWVzWzBdLmNvbXBsZXRpb25fdGltZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcmVkZWxlZ2F0aW9uc1xuICAgICAgICB9XG4gICAgfVxufSkiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBQcm9taXNlIH0gZnJvbSBcIm1ldGVvci9wcm9taXNlXCI7XG5pbXBvcnQgeyBCbG9ja3Njb24gfSBmcm9tICcvaW1wb3J0cy9hcGkvYmxvY2tzL2Jsb2Nrcy5qcyc7XG5pbXBvcnQgeyBDaGFpbiB9IGZyb20gJy9pbXBvcnRzL2FwaS9jaGFpbi9jaGFpbi5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JTZXRzIH0gZnJvbSAnL2ltcG9ydHMvYXBpL3ZhbGlkYXRvci1zZXRzL3ZhbGlkYXRvci1zZXRzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcvaW1wb3J0cy9hcGkvdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMsIEFuYWx5dGljcywgVlBEaXN0cmlidXRpb25zfSBmcm9tICcvaW1wb3J0cy9hcGkvcmVjb3Jkcy9yZWNvcmRzLmpzJztcbmltcG9ydCB7IFZvdGluZ1Bvd2VySGlzdG9yeSB9IGZyb20gJy9pbXBvcnRzL2FwaS92b3RpbmctcG93ZXIvaGlzdG9yeS5qcyc7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi8uLi90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzJztcbmltcG9ydCB7IEV2aWRlbmNlcyB9IGZyb20gJy4uLy4uL2V2aWRlbmNlcy9ldmlkZW5jZXMuanMnO1xuaW1wb3J0IHsgc2hhMjU2IH0gZnJvbSAnanMtc2hhMjU2JztcbmltcG9ydCB7IGdldEFkZHJlc3MgfSBmcm9tICd0ZW5kZXJtaW50L2xpYi9wdWJrZXknO1xuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcblxuLy8gaW1wb3J0IEJsb2NrIGZyb20gJy4uLy4uLy4uL3VpL2NvbXBvbmVudHMvQmxvY2snO1xuXG4vLyBnZXRWYWxpZGF0b3JWb3RpbmdQb3dlciA9ICh2YWxpZGF0b3JzLCBhZGRyZXNzKSA9PiB7XG4vLyAgICAgZm9yICh2IGluIHZhbGlkYXRvcnMpe1xuLy8gICAgICAgICBpZiAodmFsaWRhdG9yc1t2XS5hZGRyZXNzID09IGFkZHJlc3Mpe1xuLy8gICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbGlkYXRvcnNbdl0udm90aW5nX3Bvd2VyKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH1cbi8vIH1cblxuZ2V0UmVtb3ZlZFZhbGlkYXRvcnMgPSAocHJldlZhbGlkYXRvcnMsIHZhbGlkYXRvcnMpID0+IHtcbiAgICAvLyBsZXQgcmVtb3ZlVmFsaWRhdG9ycyA9IFtdO1xuICAgIGZvciAocCBpbiBwcmV2VmFsaWRhdG9ycyl7XG4gICAgICAgIGZvciAodiBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgIGlmIChwcmV2VmFsaWRhdG9yc1twXS5hZGRyZXNzID09IHZhbGlkYXRvcnNbdl0uYWRkcmVzcyl7XG4gICAgICAgICAgICAgICAgcHJldlZhbGlkYXRvcnMuc3BsaWNlKHAsMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJldlZhbGlkYXRvcnM7XG59XG5cbmdldFZhbGlkYXRvclByb2ZpbGVVcmwgPSAoaWRlbnRpdHkpID0+IHtcbiAgICBpZiAoaWRlbnRpdHkubGVuZ3RoID09IDE2KXtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQoYGh0dHBzOi8va2V5YmFzZS5pby9fL2FwaS8xLjAvdXNlci9sb29rdXAuanNvbj9rZXlfc3VmZml4PSR7aWRlbnRpdHl9JmZpZWxkcz1waWN0dXJlc2ApXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgbGV0IHRoZW0gPSByZXNwb25zZS5kYXRhLnRoZW1cbiAgICAgICAgICAgIHJldHVybiB0aGVtICYmIHRoZW0ubGVuZ3RoICYmIHRoZW1bMF0ucGljdHVyZXMgJiYgdGhlbVswXS5waWN0dXJlcy5wcmltYXJ5ICYmIHRoZW1bMF0ucGljdHVyZXMucHJpbWFyeS51cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShyZXNwb25zZSksICdtZXRob2RzLmJsb2Nrcy5nZXRWYWxpZGF0b3JQcm9maWxlVXJsJyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlkZW50aXR5LmluZGV4T2YoXCJrZXliYXNlLmlvL3RlYW0vXCIpPjApe1xuICAgICAgICBsZXQgdGVhbVBhZ2UgPSBIVFRQLmdldChpZGVudGl0eSk7XG4gICAgICAgIGlmICh0ZWFtUGFnZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICBsZXQgcGFnZSA9IGNoZWVyaW8ubG9hZCh0ZWFtUGFnZS5jb250ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBwYWdlKFwiLmtiLW1haW4tY2FyZCBpbWdcIikuYXR0cignc3JjJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0ZWFtUGFnZSksICdtZXRob2RzLmJsb2Nrcy5nZXRWYWxpZGF0b3JQcm9maWxlVXJsMicpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyB2YXIgZmlsdGVyZWQgPSBbMSwgMiwgMywgNCwgNV0uZmlsdGVyKG5vdENvbnRhaW5lZEluKFsxLCAyLCAzLCA1XSkpO1xuLy8gY29uc29sZS5sb2coZmlsdGVyZWQpOyAvLyBbNF1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdibG9ja3MuYXZlcmFnZUJsb2NrVGltZScoYWRkcmVzcyl7XG4gICAgICAgIGxldCBibG9ja3MgPSBCbG9ja3Njb24uZmluZCh7cHJvcG9zZXJBZGRyZXNzOmFkZHJlc3N9KS5mZXRjaCgpO1xuICAgICAgICBsZXQgaGVpZ2h0cyA9IGJsb2Nrcy5tYXAoKGJsb2NrLCBpKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gYmxvY2suaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICAgICAgbGV0IGJsb2Nrc1N0YXRzID0gQW5hbHl0aWNzLmZpbmQoe2hlaWdodDp7JGluOmhlaWdodHN9fSkuZmV0Y2goKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYmxvY2tzU3RhdHMpO1xuXG4gICAgICAgIGxldCB0b3RhbEJsb2NrRGlmZiA9IDA7XG4gICAgICAgIGZvciAoYiBpbiBibG9ja3NTdGF0cyl7XG4gICAgICAgICAgICB0b3RhbEJsb2NrRGlmZiArPSBibG9ja3NTdGF0c1tiXS50aW1lRGlmZjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG90YWxCbG9ja0RpZmYvaGVpZ2h0cy5sZW5ndGg7XG4gICAgfSxcbiAgICAnYmxvY2tzLmZpbmRVcFRpbWUnKGFkZHJlc3Mpe1xuICAgICAgICBsZXQgY29sbGVjdGlvbiA9IFZhbGlkYXRvclJlY29yZHMucmF3Q29sbGVjdGlvbigpO1xuICAgICAgICAvLyBsZXQgYWdncmVnYXRlUXVlcnkgPSBNZXRlb3Iud3JhcEFzeW5jKGNvbGxlY3Rpb24uYWdncmVnYXRlLCBjb2xsZWN0aW9uKTtcbiAgICAgICAgdmFyIHBpcGVsaW5lID0gW1xuICAgICAgICAgICAgeyRtYXRjaDp7XCJhZGRyZXNzXCI6YWRkcmVzc319LFxuICAgICAgICAgICAgLy8geyRwcm9qZWN0OnthZGRyZXNzOjEsaGVpZ2h0OjEsZXhpc3RzOjF9fSxcbiAgICAgICAgICAgIHskc29ydDp7XCJoZWlnaHRcIjotMX19LFxuICAgICAgICAgICAgeyRsaW1pdDooTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy51cHRpbWVXaW5kb3ctMSl9LFxuICAgICAgICAgICAgeyR1bndpbmQ6IFwiJF9pZFwifSxcbiAgICAgICAgICAgIHskZ3JvdXA6e1xuICAgICAgICAgICAgICAgIFwiX2lkXCI6IFwiJGFkZHJlc3NcIixcbiAgICAgICAgICAgICAgICBcInVwdGltZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHN1bVwiOntcbiAgICAgICAgICAgICAgICAgICAgICAgICRjb25kOiBbeyRlcTogWyckZXhpc3RzJywgdHJ1ZV19LCAxLCAwXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV07XG4gICAgICAgIC8vIGxldCByZXN1bHQgPSBhZ2dyZWdhdGVRdWVyeShwaXBlbGluZSwgeyBjdXJzb3I6IHt9IH0pO1xuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmF3YWl0KGNvbGxlY3Rpb24uYWdncmVnYXRlKHBpcGVsaW5lKS50b0FycmF5KCkpO1xuICAgICAgICAvLyByZXR1cm4gLmFnZ3JlZ2F0ZSgpXG4gICAgfSxcbiAgICAnYmxvY2tzLmdldExhdGVzdEhlaWdodCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHVybCA9IFJQQysnL3N0YXR1cyc7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBsZXQgc3RhdHVzID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgIHN0YXR1cyA9IHR5cGVvZiBzdGF0dXMgPT0gJ29iamVjdCcgJiYgc3RhdHVzICE9IG51bGwgJiYgc3RhdHVzLnJlc3VsdCAhPSB1bmRlZmluZWQgPyBzdGF0dXMucmVzdWx0IDogc3RhdHVzO1xuICAgICAgICAgICAgcmV0dXJuIChzdGF0dXMuc3luY19pbmZvLmxhdGVzdF9ibG9ja19oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnYmxvY2tzLmdldEN1cnJlbnRIZWlnaHQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBjdXJySGVpZ2h0ID0gQmxvY2tzY29uLmZpbmQoe30se3NvcnQ6e2hlaWdodDotMX0sbGltaXQ6MX0pLmZldGNoKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY3VycmVudEhlaWdodDpcIitjdXJySGVpZ2h0KTtcbiAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5zdGFydEhlaWdodDtcbiAgICAgICAgaWYgKGN1cnJIZWlnaHQgJiYgY3VyckhlaWdodC5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgbGV0IGhlaWdodCA9IGN1cnJIZWlnaHRbMF0uaGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGhlaWdodCA+IHN0YXJ0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBoZWlnaHRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhcnRIZWlnaHRcbiAgICB9LFxuICAgICdibG9ja3MuYmxvY2tzVXBkYXRlJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChTWU5DSU5HKVxuICAgICAgICAgICAgcmV0dXJuIFwiU3luY2luZy4uLlwiO1xuICAgICAgICBlbHNlIGNvbnNvbGUubG9nKFwic3RhcnQgdG8gc3luY1wiKTtcbiAgICAgICAgLy8gTWV0ZW9yLmNsZWFySW50ZXJ2YWwoTWV0ZW9yLnRpbWVySGFuZGxlKTtcbiAgICAgICAgLy8gZ2V0IHRoZSBsYXRlc3QgaGVpZ2h0XG4gICAgICAgIGxldCB1bnRpbCA9IE1ldGVvci5jYWxsKCdibG9ja3MuZ2V0TGF0ZXN0SGVpZ2h0Jyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHVudGlsKTtcbiAgICAgICAgLy8gZ2V0IHRoZSBjdXJyZW50IGhlaWdodCBpbiBkYlxuICAgICAgICBsZXQgY3VyciA9IE1ldGVvci5jYWxsKCdibG9ja3MuZ2V0Q3VycmVudEhlaWdodCcpO1xuICAgICAgICBjb25zb2xlLmxvZyhjdXJyKTtcbiAgICAgICAgLy8gbG9vcCBpZiB0aGVyZSdzIHVwZGF0ZSBpbiBkYlxuICAgICAgICBpZiAodW50aWwgPiBjdXJyKSB7XG4gICAgICAgICAgICBTWU5DSU5HID0gdHJ1ZTtcblxuICAgICAgICAgICAgbGV0IHZhbGlkYXRvclNldCA9IHt9XG4gICAgICAgICAgICAvLyBnZXQgbGF0ZXN0IHZhbGlkYXRvciBjYW5kaWRhdGUgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIHVybCA9IExDRCsnL3N0YWtpbmcvdmFsaWRhdG9ycyc7XG5cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gdHlwZW9mIHJlc3BvbnNlID09ICdvYmplY3QnICYmIHJlc3BvbnNlICE9IG51bGwgJiYgcmVzcG9uc2UucmVzdWx0ID8gcmVzcG9uc2UucmVzdWx0IDogcmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuZm9yRWFjaCgodmFsaWRhdG9yKSA9PiB2YWxpZGF0b3JTZXRbdmFsaWRhdG9yLmNvbnNlbnN1c19wdWJrZXldID0gdmFsaWRhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdtZXRob2RzLmJsb2Nrcy5ibG9ja3NVcGRhdGUxJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVybCA9IExDRCsnL3N0YWtpbmcvdmFsaWRhdG9ycz9zdGF0dXM9dW5ib25kaW5nJztcblxuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSB0eXBlb2YgcmVzcG9uc2UgPT0gJ29iamVjdCcgJiYgcmVzcG9uc2UgIT0gbnVsbCAmJiByZXNwb25zZS5yZXN1bHQgIT0gdW5kZWZpbmVkICA/IHJlc3BvbnNlLnJlc3VsdCA6IHJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmZvckVhY2goKHZhbGlkYXRvcikgPT4gdmFsaWRhdG9yU2V0W3ZhbGlkYXRvci5jb25zZW5zdXNfcHVia2V5XSA9IHZhbGlkYXRvcilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdtZXRob2RzLmJsb2Nrcy5ibG9ja3NVcGRhdGUyJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVybCA9IExDRCsnL3N0YWtpbmcvdmFsaWRhdG9ycz9zdGF0dXM9dW5ib25kZWQnO1xuXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICByZXNwb25zZSA9IHR5cGVvZiByZXNwb25zZSA9PSAnb2JqZWN0JyAmJiByZXNwb25zZSAhPSBudWxsICYmIHJlc3BvbnNlLnJlc3VsdCAhPSB1bmRlZmluZWQgPyByZXNwb25zZS5yZXN1bHQgOiByZXNwb25zZTtcbiAgICAgICAgICAgICAgICByZXNwb25zZS5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvclNldFt2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleV0gPSB2YWxpZGF0b3IpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5ibG9ja3MuYmxvY2tzVXBkYXRlMycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHRvdGFsVmFsaWRhdG9ycyA9IE9iamVjdC5rZXlzKHZhbGlkYXRvclNldCkubGVuZ3RoO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbGwgdmFsaWRhdG9yczogXCIrIHRvdGFsVmFsaWRhdG9ycyk7XG4gICAgICAgICAgICBmb3IgKGxldCBoZWlnaHQgPSBjdXJyKzEgOyBoZWlnaHQgPD0gdW50aWwgOyBoZWlnaHQrKykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydEJsb2NrVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gYWRkIHRpbWVvdXQgaGVyZT8gYW5kIG91dHNpZGUgdGhpcyBsb29wIChmb3IgY2F0Y2hlZCB1cCBhbmQga2VlcCBmZXRjaGluZyk/XG4gICAgICAgICAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgICAgICAgICAgbGV0IHVybCA9IFJQQysnL2Jsb2NrP2hlaWdodD0nICsgaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGxldCBhbmFseXRpY3NEYXRhID0ge307XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnVsa1ZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1bGtWYWxpZGF0b3JSZWNvcmRzID0gVmFsaWRhdG9yUmVjb3Jkcy5yYXdDb2xsZWN0aW9uKCkuaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBidWxrVlBIaXN0b3J5ID0gVm90aW5nUG93ZXJIaXN0b3J5LnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1bGtUcmFuc2F0aW9ucyA9IFRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFydEdldEhlaWdodFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJsb2NrID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrID0gdHlwZW9mIGJsb2NrID09ICdvYmplY3QnICYmIGJsb2NrICE9IG51bGwgJiYgYmxvY2sucmVzdWx0ICE9IHVuZGVmaW5lZCA/IGJsb2NrLnJlc3VsdCA6IGJsb2NrO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgaGVpZ2h0LCBoYXNoLCBudW10cmFuc2FjdGlvbiBhbmQgdGltZSBpbiBkYlxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJsb2NrRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS5oYXNoID0gYmxvY2suYmxvY2tfbWV0YS5ibG9ja19pZC5oYXNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnRyYW5zTnVtID0gYmxvY2suYmxvY2tfbWV0YS5oZWFkZXIubnVtX3R4cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS50aW1lID0gbmV3IERhdGUoYmxvY2suYmxvY2suaGVhZGVyLnRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLmxhc3RCbG9ja0hhc2ggPSBibG9jay5ibG9jay5oZWFkZXIubGFzdF9ibG9ja19pZC5oYXNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnByb3Bvc2VyQWRkcmVzcyA9IGJsb2NrLmJsb2NrLmhlYWRlci5wcm9wb3Nlcl9hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnZhbGlkYXRvcnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmVjb21taXRzID0gYmxvY2suYmxvY2subGFzdF9jb21taXQucHJlY29tbWl0cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVjb21taXRzICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHByZWNvbW1pdHMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpPTA7IGk8cHJlY29tbWl0cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVjb21taXRzW2ldICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnZhbGlkYXRvcnMucHVzaChwcmVjb21taXRzW2ldLnZhbGlkYXRvcl9hZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5dGljc0RhdGEucHJlY29tbWl0cyA9IHByZWNvbW1pdHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY29yZCBmb3IgYW5hbHl0aWNzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJlY29tbWl0UmVjb3Jkcy5pbnNlcnQoe2hlaWdodDpoZWlnaHQsIHByZWNvbW1pdHM6cHJlY29tbWl0cy5sZW5ndGh9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSB0eHMgaW4gZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jay5kYXRhLnR4cyAmJiBibG9jay5ibG9jay5kYXRhLnR4cy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHQgaW4gYmxvY2suYmxvY2suZGF0YS50eHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNZXRlb3IuY2FsbCgnVHJhbnNhY3Rpb25zLmluZGV4Jywgc2hhMjU2KEJ1ZmZlci5mcm9tKGJsb2NrLmJsb2NrLmRhdGEudHhzW3RdLCAnYmFzZTY0JykpLCBibG9ja0RhdGEudGltZSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIsICdtZXRob2RzLmJsb2Nrcy5ibG9ja3NVcGRhdGU0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSBkb3VibGUgc2lnbiBldmlkZW5jZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jay5ldmlkZW5jZS5ldmlkZW5jZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRXZpZGVuY2VzLmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmlkZW5jZTogYmxvY2suYmxvY2suZXZpZGVuY2UuZXZpZGVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnByZWNvbW1pdHNDb3VudCA9IGJsb2NrRGF0YS52YWxpZGF0b3JzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHl0aWNzRGF0YS5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmRHZXRIZWlnaHRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2V0IGhlaWdodCB0aW1lOiBcIisoKGVuZEdldEhlaWdodFRpbWUtc3RhcnRHZXRIZWlnaHRUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGFydEdldFZhbGlkYXRvcnNUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBjaGFpbiBzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IFJQQysnL3ZhbGlkYXRvcnM/aGVpZ2h0PScraGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3JzID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnMgPSB0eXBlb2YgdmFsaWRhdG9ycyA9PSAnb2JqZWN0JyAmJiB2YWxpZGF0b3JzICE9IG51bGwgJiYgdmFsaWRhdG9ycy5yZXN1bHQgIT0gdW5kZWZpbmVkID8gdmFsaWRhdG9ycy5yZXN1bHQgOiB2YWxpZGF0b3JzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9ycy5ibG9ja19oZWlnaHQgPSBwYXJzZUludCh2YWxpZGF0b3JzLmJsb2NrX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBWYWxpZGF0b3JTZXRzLmluc2VydCh2YWxpZGF0b3JzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnZhbGlkYXRvcnNDb3VudCA9IHZhbGlkYXRvcnMudmFsaWRhdG9ycy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhcnRCbG9ja0luc2VydFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgQmxvY2tzY29uLmluc2VydChibG9ja0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZEJsb2NrSW5zZXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJsb2NrIGluc2VydCB0aW1lOiBcIisoKGVuZEJsb2NrSW5zZXJ0VGltZS1zdGFydEJsb2NrSW5zZXJ0VGltZSkvMTAwMCkrXCJzZWNvbmRzLlwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgdmFsZGlhdG9ycyBleGlzdCByZWNvcmRzXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXhpc3RpbmdWYWxpZGF0b3JzID0gVmFsaWRhdG9ycy5maW5kKHthZGRyZXNzOnskZXhpc3RzOnRydWV9fSkuZmV0Y2goKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhlaWdodCA+IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY29yZCBwcmVjb21taXRzIGFuZCBjYWxjdWxhdGUgdXB0aW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSByZWNvcmQgZnJvbSBibG9jayAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpIGluIHZhbGlkYXRvcnMudmFsaWRhdG9ycyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhZGRyZXNzID0gdmFsaWRhdG9ycy52YWxpZGF0b3JzW2ldLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWNvcmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IGFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiBwYXJzZUludCh2YWxpZGF0b3JzLnZhbGlkYXRvcnNbaV0udm90aW5nX3Bvd2VyKS8vZ2V0VmFsaWRhdG9yVm90aW5nUG93ZXIoZXhpc3RpbmdWYWxpZGF0b3JzLCBhZGRyZXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiBpbiBwcmVjb21taXRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVjb21taXRzW2pdICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzID09IHByZWNvbW1pdHNbal0udmFsaWRhdG9yX2FkZHJlc3Mpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQuZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlY29tbWl0cy5zcGxpY2UoaiwxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSB1cHRpbWUgYmFzZWQgb24gdGhlIHJlY29yZHMgc3RvcmVkIGluIHByZXZpb3VzIGJsb2Nrc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGRvIHRoaXMgZXZlcnkgMTUgYmxvY2tzIH5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGhlaWdodCAlIDE1KSA9PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBzdGFydEFnZ1RpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG51bUJsb2NrcyA9IE1ldGVvci5jYWxsKCdibG9ja3MuZmluZFVwVGltZScsIGFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVwdGltZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZW5kQWdnVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkdldCBhZ2dyZWdhdGVkIHVwdGltZSBmb3IgXCIrZXhpc3RpbmdWYWxpZGF0b3JzW2ldLmFkZHJlc3MrXCI6IFwiKygoZW5kQWdnVGltZS1zdGFydEFnZ1RpbWUpLzEwMDApK1wic2Vjb25kcy5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKG51bUJsb2Nrc1swXSAhPSBudWxsKSAmJiAobnVtQmxvY2tzWzBdLnVwdGltZSAhPSBudWxsKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXB0aW1lID0gbnVtQmxvY2tzWzBdLnVwdGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJhc2UgPSBNZXRlb3Iuc2V0dGluZ3MucHVibGljLnVwdGltZVdpbmRvdztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoZWlnaHQgPCBiYXNlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXNlID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmV4aXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVwdGltZSA8IGJhc2Upe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cHRpbWUrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXB0aW1lID0gKHVwdGltZSAvIGJhc2UpKjEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9ycy5maW5kKHthZGRyZXNzOmFkZHJlc3N9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6e3VwdGltZTp1cHRpbWUsIGxhc3RTZWVuOmJsb2NrRGF0YS50aW1lfX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cHRpbWUgPSAodXB0aW1lIC8gYmFzZSkqMTAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmZpbmQoe2FkZHJlc3M6YWRkcmVzc30pLnVwc2VydCgpLnVwZGF0ZU9uZSh7JHNldDp7dXB0aW1lOnVwdGltZX19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JSZWNvcmRzLmluc2VydChyZWNvcmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZGF0b3JSZWNvcmRzLnVwZGF0ZSh7aGVpZ2h0OmhlaWdodCxhZGRyZXNzOnJlY29yZC5hZGRyZXNzfSxyZWNvcmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNoYWluU3RhdHVzID0gQ2hhaW4uZmluZE9uZSh7Y2hhaW5JZDpibG9jay5ibG9ja19tZXRhLmhlYWRlci5jaGFpbl9pZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RTeW5jZWRUaW1lID0gY2hhaW5TdGF0dXM/Y2hhaW5TdGF0dXMubGFzdFN5bmNlZFRpbWU6MDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aW1lRGlmZjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBibG9ja1RpbWUgPSBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLmRlZmF1bHRCbG9ja1RpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFN5bmNlZFRpbWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRlTGF0ZXN0ID0gYmxvY2tEYXRhLnRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGVMYXN0ID0gbmV3IERhdGUobGFzdFN5bmNlZFRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVEaWZmID0gTWF0aC5hYnMoZGF0ZUxhdGVzdC5nZXRUaW1lKCkgLSBkYXRlTGFzdC5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVGltZSA9IChjaGFpblN0YXR1cy5ibG9ja1RpbWUgKiAoYmxvY2tEYXRhLmhlaWdodCAtIDEpICsgdGltZURpZmYpIC8gYmxvY2tEYXRhLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZEdldFZhbGlkYXRvcnNUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2V0IGhlaWdodCB2YWxpZGF0b3JzIHRpbWU6IFwiKygoZW5kR2V0VmFsaWRhdG9yc1RpbWUtc3RhcnRHZXRWYWxpZGF0b3JzVGltZSkvMTAwMCkrXCJzZWNvbmRzLlwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgQ2hhaW4udXBkYXRlKHtjaGFpbklkOmJsb2NrLmJsb2NrX21ldGEuaGVhZGVyLmNoYWluX2lkfSwgeyRzZXQ6e2xhc3RTeW5jZWRUaW1lOmJsb2NrRGF0YS50aW1lLCBibG9ja1RpbWU6YmxvY2tUaW1lfX0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLmF2ZXJhZ2VCbG9ja1RpbWUgPSBibG9ja1RpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLnRpbWVEaWZmID0gdGltZURpZmY7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5dGljc0RhdGEudGltZSA9IGJsb2NrRGF0YS50aW1lO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbml0aWFsaXplIHZhbGlkYXRvciBkYXRhIGF0IGZpcnN0IGJsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAoaGVpZ2h0ID09IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIFZhbGlkYXRvcnMucmVtb3ZlKHt9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHl0aWNzRGF0YS52b3RpbmdfcG93ZXIgPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhcnRGaW5kVmFsaWRhdG9yc05hbWVUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3JzIGFyZSBhbGwgdGhlIHZhbGlkYXRvcnMgaW4gdGhlIGN1cnJlbnQgaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ2YWxpZGF0b3JTZXQgc2l6ZTogXCIrdmFsaWRhdG9ycy52YWxpZGF0b3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2IGluIHZhbGlkYXRvcnMudmFsaWRhdG9ycyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRvcnMuaW5zZXJ0KHZhbGlkYXRvcnMudmFsaWRhdG9yc1t2XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3IgPSB2YWxpZGF0b3JzLnZhbGlkYXRvcnNbdl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci52b3RpbmdfcG93ZXIgPSBwYXJzZUludCh2YWxpZGF0b3Iudm90aW5nX3Bvd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnByb3Bvc2VyX3ByaW9yaXR5ID0gcGFyc2VJbnQodmFsaWRhdG9yLnByb3Bvc2VyX3ByaW9yaXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsRXhpc3QgPSBWYWxpZGF0b3JzLmZpbmRPbmUoe1wicHViX2tleS52YWx1ZVwiOnZhbGlkYXRvci5wdWJfa2V5LnZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdmFsRXhpc3Qpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHZhbGlkYXRvciBwdWJfa2V5ICR7dmFsaWRhdG9yLmFkZHJlc3N9ICR7dmFsaWRhdG9yLnB1Yl9rZXkudmFsdWV9IG5vdCBpbiBkYmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGNvbW1hbmQgPSBNZXRlb3Iuc2V0dGluZ3MuYmluLmdhaWFkZWJ1ZytcIiBwdWJrZXkgXCIrdmFsaWRhdG9yLnB1Yl9rZXkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjb21tYW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB0ZW1wVmFsID0gdmFsaWRhdG9yO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuYWRkcmVzcyA9IGdldEFkZHJlc3ModmFsaWRhdG9yLnB1Yl9rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmFjY3B1YiA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbGlkYXRvci5wdWJfa2V5LCBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeEFjY1B1Yik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3Iub3BlcmF0b3JfcHVia2V5ID0gTWV0ZW9yLmNhbGwoJ3B1YmtleVRvQmVjaDMyJywgdmFsaWRhdG9yLnB1Yl9rZXksIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4VmFsUHViKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5jb25zZW5zdXNfcHVia2V5ID0gTWV0ZW9yLmNhbGwoJ3B1YmtleVRvQmVjaDMyJywgdmFsaWRhdG9yLnB1Yl9rZXksIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4Q29uc1B1Yik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3JEYXRhID0gdmFsaWRhdG9yU2V0W3ZhbGlkYXRvci5jb25zZW5zdXNfcHVia2V5XVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRvckRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZGF0b3JEYXRhLmRlc2NyaXB0aW9uLmlkZW50aXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IucHJvZmlsZV91cmwgPSAgZ2V0VmFsaWRhdG9yUHJvZmlsZVVybCh2YWxpZGF0b3JEYXRhLmRlc2NyaXB0aW9uLmlkZW50aXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5vcGVyYXRvcl9hZGRyZXNzID0gdmFsaWRhdG9yRGF0YS5vcGVyYXRvcl9hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5kZWxlZ2F0b3JfYWRkcmVzcyA9IE1ldGVvci5jYWxsKCdnZXREZWxlZ2F0b3InLCB2YWxpZGF0b3JEYXRhLm9wZXJhdG9yX2FkZHJlc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5qYWlsZWQgPSB2YWxpZGF0b3JEYXRhLmphaWxlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3Iuc3RhdHVzID0gdmFsaWRhdG9yRGF0YS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLm1pbl9zZWxmX2RlbGVnYXRpb24gPSB2YWxpZGF0b3JEYXRhLm1pbl9zZWxmX2RlbGVnYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnRva2VucyA9IHZhbGlkYXRvckRhdGEudG9rZW5zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5kZWxlZ2F0b3Jfc2hhcmVzID0gdmFsaWRhdG9yRGF0YS5kZWxlZ2F0b3Jfc2hhcmVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5kZXNjcmlwdGlvbiA9IHZhbGlkYXRvckRhdGEuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmJvbmRfaGVpZ2h0ID0gdmFsaWRhdG9yRGF0YS5ib25kX2hlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuYm9uZF9pbnRyYV90eF9jb3VudGVyID0gdmFsaWRhdG9yRGF0YS5ib25kX2ludHJhX3R4X2NvdW50ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnVuYm9uZGluZ19oZWlnaHQgPSB2YWxpZGF0b3JEYXRhLnVuYm9uZGluZ19oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnVuYm9uZGluZ190aW1lID0gdmFsaWRhdG9yRGF0YS51bmJvbmRpbmdfdGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuY29tbWlzc2lvbiA9IHZhbGlkYXRvckRhdGEuY29tbWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3Iuc2VsZl9kZWxlZ2F0aW9uID0gdmFsaWRhdG9yLmRlbGVnYXRvcl9zaGFyZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLnJlbW92ZWQgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3IucmVtb3ZlZEF0ID0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRvclNldC5zcGxpY2UodmFsLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGNvbiBwdWIga2V5PycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1bGtWYWxpZGF0b3JzLmluc2VydCh2YWxpZGF0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZhbGlkYXRvcnMuZmluZCh7Y29uc2Vuc3VzX3B1YmtleTogdmFsaWRhdG9yLmNvbnNlbnN1c19wdWJrZXl9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6dmFsaWRhdG9yfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInZhbGlkYXRvciBmaXJzdCBhcHBlYXJzOiBcIitidWxrVmFsaWRhdG9ycy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZQSGlzdG9yeS5pbnNlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHZhbGlkYXRvci5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZfdm90aW5nX3Bvd2VyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ19wb3dlcjogdmFsaWRhdG9yLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGJsb2NrRGF0YS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tfdGltZTogYmxvY2tEYXRhLnRpbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNZXRlb3IuY2FsbCgncnVuQ29kZScsIGNvbW1hbmQsIGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLmFkZHJlc3MgPSByZXN1bHQubWF0Y2goL1xcc1swLTlBLUZdezQwfSQvaWdtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRvci5hZGRyZXNzID0gdmFsaWRhdG9yLmFkZHJlc3NbMF0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLmhleCA9IHJlc3VsdC5tYXRjaCgvXFxzWzAtOUEtRl17NjR9JC9pZ20pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLmhleCA9IHZhbGlkYXRvci5oZXhbMF0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLmNvc21vc2FjY3B1YiA9IHJlc3VsdC5tYXRjaCgvY29zbW9zcHViLiokL2lnbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3IuY29zbW9zYWNjcHViID0gdmFsaWRhdG9yLmNvc21vc2FjY3B1YlswXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3Iub3BlcmF0b3JfcHVia2V5ID0gcmVzdWx0Lm1hdGNoKC9jb3Ntb3N2YWxvcGVycHViLiokL2lnbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3Iub3BlcmF0b3JfcHVia2V5ID0gdmFsaWRhdG9yLm9wZXJhdG9yX3B1YmtleVswXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleSA9IHJlc3VsdC5tYXRjaCgvY29zbW9zdmFsY29uc3B1Yi4qJC9pZ20pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yLmNvbnNlbnN1c19wdWJrZXkgPSB2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleVswXS50cmltKCk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvckRhdGEgPSB2YWxpZGF0b3JTZXRbdmFsRXhpc3QuY29uc2Vuc3VzX3B1YmtleV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZGF0b3JEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRhdG9yRGF0YS5kZXNjcmlwdGlvbiAmJiAoIXZhbEV4aXN0LmRlc2NyaXB0aW9uIHx8IHZhbGlkYXRvckRhdGEuZGVzY3JpcHRpb24uaWRlbnRpdHkgIT09IHZhbEV4aXN0LmRlc2NyaXB0aW9uLmlkZW50aXR5KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnByb2ZpbGVfdXJsID0gIGdldFZhbGlkYXRvclByb2ZpbGVVcmwodmFsaWRhdG9yRGF0YS5kZXNjcmlwdGlvbi5pZGVudGl0eSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuamFpbGVkID0gdmFsaWRhdG9yRGF0YS5qYWlsZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnN0YXR1cyA9IHZhbGlkYXRvckRhdGEuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci50b2tlbnMgPSB2YWxpZGF0b3JEYXRhLnRva2VucztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuZGVsZWdhdG9yX3NoYXJlcyA9IHZhbGlkYXRvckRhdGEuZGVsZWdhdG9yX3NoYXJlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuZGVzY3JpcHRpb24gPSB2YWxpZGF0b3JEYXRhLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5ib25kX2hlaWdodCA9IHZhbGlkYXRvckRhdGEuYm9uZF9oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmJvbmRfaW50cmFfdHhfY291bnRlciA9IHZhbGlkYXRvckRhdGEuYm9uZF9pbnRyYV90eF9jb3VudGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci51bmJvbmRpbmdfaGVpZ2h0ID0gdmFsaWRhdG9yRGF0YS51bmJvbmRpbmdfaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci51bmJvbmRpbmdfdGltZSA9IHZhbGlkYXRvckRhdGEudW5ib25kaW5nX3RpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmNvbW1pc3Npb24gPSB2YWxpZGF0b3JEYXRhLmNvbW1pc3Npb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgc2VsZiBkZWxlZ2F0aW9uIHBlcmNlbnRhZ2UgZXZlcnkgMzAgYmxvY2tzXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGVpZ2h0ICUgMzAgPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KExDRCArICcvc3Rha2luZy9kZWxlZ2F0b3JzLycrdmFsRXhpc3QuZGVsZWdhdG9yX2FkZHJlc3MrJy9kZWxlZ2F0aW9ucy8nK3ZhbEV4aXN0Lm9wZXJhdG9yX2FkZHJlc3MpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzZWxmRGVsZWdhdGlvbiA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZkRlbGVnYXRpb24gPSB0eXBlb2Ygc2VsZkRlbGVnYXRpb24gPT0gJ29iamVjdCcgJiYgc2VsZkRlbGVnYXRpb24gIT0gbnVsbCAmJiBzZWxmRGVsZWdhdGlvbi5yZXN1bHQgIT0gdW5kZWZpbmVkID8gc2VsZkRlbGVnYXRpb24ucmVzdWx0IDogc2VsZkRlbGVnYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGZEZWxlZ2F0aW9uLnNoYXJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5zZWxmX2RlbGVnYXRpb24gPSBwYXJzZUZsb2F0KHNlbGZEZWxlZ2F0aW9uLnNoYXJlcykvcGFyc2VGbG9hdCh2YWxpZGF0b3IuZGVsZWdhdG9yX3NoYXJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9ycy5maW5kKHtjb25zZW5zdXNfcHVia2V5OiB2YWxFeGlzdC5jb25zZW5zdXNfcHVia2V5fSkudXBkYXRlT25lKHskc2V0OnZhbGlkYXRvcn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwidmFsaWRhdG9yIGV4aXNpdHM6IFwiK2J1bGtWYWxpZGF0b3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsaWRhdG9yU2V0LnNwbGljZSh2YWwsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGNvbiBwdWIga2V5PycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldlZvdGluZ1Bvd2VyID0gVm90aW5nUG93ZXJIaXN0b3J5LmZpbmRPbmUoe2FkZHJlc3M6dmFsaWRhdG9yLmFkZHJlc3N9LCB7aGVpZ2h0Oi0xLCBsaW1pdDoxfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2Vm90aW5nUG93ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2Vm90aW5nUG93ZXIudm90aW5nX3Bvd2VyICE9IHZhbGlkYXRvci52b3RpbmdfcG93ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY2hhbmdlVHlwZSA9IChwcmV2Vm90aW5nUG93ZXIudm90aW5nX3Bvd2VyID4gdmFsaWRhdG9yLnZvdGluZ19wb3dlcik/J2Rvd24nOid1cCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjaGFuZ2VEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkcmVzczogdmFsaWRhdG9yLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2X3ZvdGluZ19wb3dlcjogcHJldlZvdGluZ1Bvd2VyLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ19wb3dlcjogdmFsaWRhdG9yLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNoYW5nZVR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGJsb2NrRGF0YS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja190aW1lOiBibG9ja0RhdGEudGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygndm90aW5nIHBvd2VyIGNoYW5nZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGNoYW5nZURhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVlBIaXN0b3J5Lmluc2VydChjaGFuZ2VEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codmFsaWRhdG9yKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLnZvdGluZ19wb3dlciArPSB2YWxpZGF0b3Iudm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIHZhbGlkYXRvciByZW1vdmVkXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldlZhbGlkYXRvcnMgPSBWYWxpZGF0b3JTZXRzLmZpbmRPbmUoe2Jsb2NrX2hlaWdodDpoZWlnaHQtMX0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZWYWxpZGF0b3JzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZWRWYWxpZGF0b3JzID0gZ2V0UmVtb3ZlZFZhbGlkYXRvcnMocHJldlZhbGlkYXRvcnMudmFsaWRhdG9ycywgdmFsaWRhdG9ycy52YWxpZGF0b3JzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHIgaW4gcmVtb3ZlZFZhbGlkYXRvcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZQSGlzdG9yeS5pbnNlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHJlbW92ZWRWYWxpZGF0b3JzW3JdLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldl92b3RpbmdfcG93ZXI6IHJlbW92ZWRWYWxpZGF0b3JzW3JdLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdfcG93ZXI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlbW92ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBibG9ja0RhdGEuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrX3RpbWU6IGJsb2NrRGF0YS50aW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZXJlJ3MgYW55IHZhbGlkYXRvciBub3QgaW4gZGIgMTQ0MDAgYmxvY2tzKH4xIGRheSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoZWlnaHQgJSAxNDQwMCA9PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgYWxsIHZhbGlkYXRvcnMgYWdhaW5zdCBkYi4uLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGJWYWxpZGF0b3JzID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZhbGlkYXRvcnMuZmluZCh7fSwge2ZpZWxkczoge2NvbnNlbnN1c19wdWJrZXk6IDEsIHN0YXR1czogMX19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLmZvckVhY2goKHYpID0+IGRiVmFsaWRhdG9yc1t2LmNvbnNlbnN1c19wdWJrZXldID0gdi5zdGF0dXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHZhbGlkYXRvclNldCkuZm9yRWFjaCgoY29uUHViS2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9yRGF0YSA9IHZhbGlkYXRvclNldFtjb25QdWJLZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWN0aXZlIHZhbGlkYXRvcnMgc2hvdWxkIGhhdmUgYmVlbiB1cGRhdGVkIGluIHByZXZpb3VzIHN0ZXBzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRhdG9yRGF0YS5zdGF0dXMgPT09IDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYlZhbGlkYXRvcnNbY29uUHViS2V5XSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgdmFsaWRhdG9yIHdpdGggY29uc2Vuc3VzX3B1YmtleSAke2NvblB1YktleX0gbm90IGluIGRiYCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JEYXRhLnB1Yl9rZXkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiIDogXCJ0ZW5kZXJtaW50L1B1YktleUVkMjU1MTlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiBNZXRlb3IuY2FsbCgnYmVjaDMyVG9QdWJrZXknLCBjb25QdWJLZXkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JEYXRhLmFkZHJlc3MgPSBnZXRBZGRyZXNzKHZhbGlkYXRvckRhdGEucHViX2tleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yRGF0YS5kZWxlZ2F0b3JfYWRkcmVzcyA9IE1ldGVvci5jYWxsKCdnZXREZWxlZ2F0b3InLCB2YWxpZGF0b3JEYXRhLm9wZXJhdG9yX2FkZHJlc3MpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yRGF0YS5hY2NwdWIgPSBNZXRlb3IuY2FsbCgncHVia2V5VG9CZWNoMzInLCB2YWxpZGF0b3JEYXRhLnB1Yl9rZXksIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4QWNjUHViKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JEYXRhLm9wZXJhdG9yX3B1YmtleSA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbGlkYXRvckRhdGEucHViX2tleSwgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhWYWxQdWIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHZhbGlkYXRvckRhdGEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmZpbmQoe2NvbnNlbnN1c19wdWJrZXk6IGNvblB1YktleX0pLnVwc2VydCgpLnVwZGF0ZU9uZSh7JHNldDp2YWxpZGF0b3JEYXRhfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRiVmFsaWRhdG9yc1tjb25QdWJLZXldID09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9ycy5maW5kKHtjb25zZW5zdXNfcHVia2V5OiBjb25QdWJLZXl9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6dmFsaWRhdG9yRGF0YX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5ibG9ja3MuYmxvY2tzVXBkYXRlNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmV0Y2hpbmcga2V5YmFzZSBldmVyeSAxNDQwMCBibG9ja3MofjEgZGF5KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhlaWdodCAlIDE0NDAwID09IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGZXRjaGluZyBrZXliYXNlLi4uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVmFsaWRhdG9ycy5maW5kKHt9KS5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcm9maWxlVXJsID0gIGdldFZhbGlkYXRvclByb2ZpbGVVcmwodmFsaWRhdG9yLmRlc2NyaXB0aW9uLmlkZW50aXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2ZpbGVVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9ycy5maW5kKHthZGRyZXNzOiB2YWxpZGF0b3IuYWRkcmVzc31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6eydwcm9maWxlX3VybCc6cHJvZmlsZVVybH19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuYmxvY2tzLmJsb2Nrc1VwZGF0ZTYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmRGaW5kVmFsaWRhdG9yc05hbWVUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2V0IHZhbGlkYXRvcnMgbmFtZSB0aW1lOiBcIisoKGVuZEZpbmRWYWxpZGF0b3JzTmFtZVRpbWUtc3RhcnRGaW5kVmFsaWRhdG9yc05hbWVUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZWNvcmQgZm9yIGFuYWx5dGljc1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFuYWx5dGljcy5pbnNlcnQoYW5hbHl0aWNzRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5kQW5hbHl0aWNzSW5zZXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFuYWx5dGljcyBpbnNlcnQgdGltZTogXCIrKChlbmRBbmFseXRpY3NJbnNlcnRUaW1lLXN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhcnRWVXBUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWxrVmFsaWRhdG9ycy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhidWxrVmFsaWRhdG9ycy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmV4ZWN1dGUoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLCAnbWV0aG9kcy5ibG9ja3MuYmxvY2tzVXBkYXRlNycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5kVlVwVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZhbGlkYXRvciB1cGRhdGUgdGltZTogXCIrKChlbmRWVXBUaW1lLXN0YXJ0VlVwVGltZSkvMTAwMCkrXCJzZWNvbmRzLlwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0VlJUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWxrVmFsaWRhdG9yUmVjb3Jkcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9yUmVjb3Jkcy5leGVjdXRlKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciwgJ21ldGhvZHMuYmxvY2tzLmJsb2Nrc1VwZGF0ZTI2Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZFZSVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZhbGlkYXRvciByZWNvcmRzIHVwZGF0ZSB0aW1lOiBcIisoKGVuZFZSVGltZS1zdGFydFZSVGltZSkvMTAwMCkrXCJzZWNvbmRzLlwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGtWUEhpc3RvcnkubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZQSGlzdG9yeS5leGVjdXRlKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciwgJ21ldGhvZHMuYmxvY2tzLmJsb2Nrc1VwZGF0ZTgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsa1RyYW5zYXRpb25zLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtUcmFuc2F0aW9ucy5leGVjdXRlKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciwgJ21ldGhvZHMuYmxvY2tzLmJsb2Nrc1VwZGF0ZTknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdm90aW5nIHBvd2VyIGRpc3RyaWJ1dGlvbiBldmVyeSA2MCBibG9ja3MgfiA1bWluc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGVpZ2h0ICUgNjAgPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCI9PT09PSBjYWxjdWxhdGUgdm90aW5nIHBvd2VyIGRpc3RyaWJ1dGlvbiA9PT09PVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aXZlVmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMuZmluZCh7c3RhdHVzOjIsamFpbGVkOmZhbHNlfSx7c29ydDp7dm90aW5nX3Bvd2VyOi0xfX0pLmZldGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG51bVRvcFR3ZW50eSA9IE1hdGguY2VpbChhY3RpdmVWYWxpZGF0b3JzLmxlbmd0aCowLjIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBudW1Cb3R0b21FaWdodHkgPSBhY3RpdmVWYWxpZGF0b3JzLmxlbmd0aCAtIG51bVRvcFR3ZW50eTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3BUd2VudHlQb3dlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJvdHRvbUVpZ2h0eVBvd2VyID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBudW1Ub3BUaGlydHlGb3VyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbnVtQm90dG9tU2l4dHlTaXggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3BUaGlydHlGb3VyUGVyY2VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJvdHRvbVNpeHR5U2l4UGVyY2VudCA9IDA7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2IGluIGFjdGl2ZVZhbGlkYXRvcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodiA8IG51bVRvcFR3ZW50eSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3BUd2VudHlQb3dlciArPSBhY3RpdmVWYWxpZGF0b3JzW3ZdLnZvdGluZ19wb3dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tRWlnaHR5UG93ZXIgKz0gYWN0aXZlVmFsaWRhdG9yc1t2XS52b3RpbmdfcG93ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b3BUaGlydHlGb3VyUGVyY2VudCA8IDAuMzQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wVGhpcnR5Rm91clBlcmNlbnQgKz0gYWN0aXZlVmFsaWRhdG9yc1t2XS52b3RpbmdfcG93ZXIgLyBhbmFseXRpY3NEYXRhLnZvdGluZ19wb3dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bVRvcFRoaXJ0eUZvdXIrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbVNpeHR5U2l4UGVyY2VudCA9IDEgLSB0b3BUaGlydHlGb3VyUGVyY2VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1Cb3R0b21TaXh0eVNpeCA9IGFjdGl2ZVZhbGlkYXRvcnMubGVuZ3RoIC0gbnVtVG9wVGhpcnR5Rm91cjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2cERpc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1Ub3BUd2VudHk6IG51bVRvcFR3ZW50eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wVHdlbnR5UG93ZXI6IHRvcFR3ZW50eVBvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1Cb3R0b21FaWdodHk6IG51bUJvdHRvbUVpZ2h0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tRWlnaHR5UG93ZXI6IGJvdHRvbUVpZ2h0eVBvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1Ub3BUaGlydHlGb3VyOiBudW1Ub3BUaGlydHlGb3VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3BUaGlydHlGb3VyUGVyY2VudDogdG9wVGhpcnR5Rm91clBlcmNlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUJvdHRvbVNpeHR5U2l4OiBudW1Cb3R0b21TaXh0eVNpeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tU2l4dHlTaXhQZXJjZW50OiBib3R0b21TaXh0eVNpeFBlcmNlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bVZhbGlkYXRvcnM6IGFjdGl2ZVZhbGlkYXRvcnMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFZvdGluZ1Bvd2VyOiBhbmFseXRpY3NEYXRhLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tUaW1lOiBibG9ja0RhdGEudGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlQXQ6IG5ldyBEYXRlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codnBEaXN0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZQRGlzdHJpYnV0aW9ucy5pbnNlcnQodnBEaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdtZXRob2RzLmJsb2Nrcy5ibG9ja3NVcGRhdGUxMCcpO1xuICAgICAgICAgICAgICAgICAgICBTWU5DSU5HID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlN0b3BwZWRcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGVuZEJsb2NrVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUaGlzIGJsb2NrIHVzZWQ6IFwiKygoZW5kQmxvY2tUaW1lLXN0YXJ0QmxvY2tUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgU1lOQ0lORyA9IGZhbHNlO1xuICAgICAgICAgICAgQ2hhaW4udXBkYXRlKHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntsYXN0QmxvY2tzU3luY2VkVGltZTpuZXcgRGF0ZSgpLCB0b3RhbFZhbGlkYXRvcnM6dG90YWxWYWxpZGF0b3JzfX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVudGlsO1xuICAgIH0sXG4gICAgJ2FkZExpbWl0JzogZnVuY3Rpb24obGltaXQpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2cobGltaXQrMTApXG4gICAgICAgIHJldHVybiAobGltaXQrMTApO1xuICAgIH0sXG4gICAgJ2hhc01vcmUnOiBmdW5jdGlvbihsaW1pdCkge1xuICAgICAgICBpZiAobGltaXQgPiBNZXRlb3IuY2FsbCgnZ2V0Q3VycmVudEhlaWdodCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJ2Jsb2NrTGlzdFBhZ2luYXRpb24nOiBmdW5jdGlvbihwYWdlLCBsaW1pdCwgc29ydF9maWVsZCwgc29ydF9vcmRlcilcbiAgICB7XG4gICAgICAgIGxldCBjb3VudEFsbCA9IEJsb2Nrc2Nvbi5maW5kKCkuY291bnQoKTtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgcGFnaW5hdGlvbjoge1xuICAgICAgICAgICAgICAgIHRvdGFsX3BhZ2U6IE1hdGgucm91bmQoY291bnRBbGwgLyBsaW1pdCksXG4gICAgICAgICAgICAgICAgdG90YWxfcmVjb3JkOiBjb3VudEFsbCxcbiAgICAgICAgICAgICAgICBjdXJyZW50X3BhZ2U6IHBhZ2UsXG4gICAgICAgICAgICAgICAgZnJvbTogKHBhZ2UgLSAxKSAqIGxpbWl0ICsgMSxcbiAgICAgICAgICAgICAgICB0bzogcGFnZSAqIGxpbWl0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGxldCBvZmZzZXQgPSBwYWdlICogbGltaXQ7XG4gICAgICAgIGxldCBkYXRhID0gQmxvY2tzY29uLmZpbmQoe30sIHsgc29ydDogeyBbc29ydF9maWVsZF06IChzb3J0X29yZGVyID09ICdkZXNjJyA/IC0xIDogMSkgfSwgc2tpcDogb2Zmc2V0LCBsaW1pdDogbGltaXQgfSkuZmV0Y2goKTtcbiAgICAgICAgcmVzcG9uc2UuZGF0YSA9IGRhdGEgPyBkYXRhLm1hcCh2ID0+IHtcbiAgICAgICAgICAgIHYudmFsaWRhdG9yID0gdi5wcm9wb3NlcigpO1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0pIDogW107XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSk7XG4gICAgfSxcblxuICAgICdibG9ja0RldGFpbEJ5SGVpZ2h0JzogZnVuY3Rpb24oaGVpZ2h0KVxuICAgIHtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0ge2RhdGE6IHt9fTtcbiAgICAgICAgbGV0IGJsb2NrID0gQmxvY2tzY29uLmZpbmQoe2hlaWdodDogaGVpZ2h0fSkuZmV0Y2goKTtcbiAgICAgICAgaWYoYmxvY2spe1xuICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IGJsb2NrLm1hcCh2ID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgdHJhbnNhY3Rpb25zID0gTWV0ZW9yLmNhbGwoJ1RyYW5zYWN0aW9ucy5maW5kQnlIZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICAgICAgICAgIHYudHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zID8gdHJhbnNhY3Rpb25zIDogW107XG4gICAgICAgICAgICAgICAgdi52YWxpZGF0b3IgPSB2LnByb3Bvc2VyKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBCbG9ja3Njb24gfSBmcm9tICcuLi9ibG9ja3MuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uLy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi8uLi90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzJztcblxucHVibGlzaENvbXBvc2l0ZSgnYmxvY2tzLmhlaWdodCcsIGZ1bmN0aW9uKGxpbWl0KXtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gQmxvY2tzY29uLmZpbmQoe30sIHtsaW1pdDogbGltaXQsIHNvcnQ6IHtoZWlnaHQ6IC0xfX0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZChibG9jayl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWYWxpZGF0b3JzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICB7YWRkcmVzczpibG9jay5wcm9wb3NlckFkZHJlc3N9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2xpbWl0OjF9XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KTtcblxucHVibGlzaENvbXBvc2l0ZSgnYmxvY2tzLmZpbmRPbmUnLCBmdW5jdGlvbihoZWlnaHQpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBCbG9ja3Njb24uZmluZCh7aGVpZ2h0OmhlaWdodH0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZChibG9jayl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHtoZWlnaHQ6YmxvY2suaGVpZ2h0fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKGJsb2NrKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHthZGRyZXNzOmJsb2NrLnByb3Bvc2VyQWRkcmVzc30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7bGltaXQ6MX1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5cbmV4cG9ydCBjb25zdCBCbG9ja3Njb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYmxvY2tzJyk7XG5cbkJsb2Nrc2Nvbi5oZWxwZXJzKHtcbiAgICBwcm9wb3Nlcigpe1xuICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kT25lKHthZGRyZXNzOnRoaXMucHJvcG9zZXJBZGRyZXNzfSk7XG4gICAgfVxufSk7XG5cbi8vIEJsb2Nrc2Nvbi5oZWxwZXJzKHtcbi8vICAgICBzb3J0ZWQobGltaXQpIHtcbi8vICAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kKHt9LCB7c29ydDoge2hlaWdodDotMX0sIGxpbWl0OiBsaW1pdH0pO1xuLy8gICAgIH1cbi8vIH0pO1xuXG5cbi8vIE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbi8vICAgICBNZXRlb3IuY2FsbCgnYmxvY2tzVXBkYXRlJywgKGVycm9yLCByZXN1bHQpID0+IHtcbi8vICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbi8vICAgICB9KVxuLy8gfSwgMzAwMDAwMDApOyIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCB7IGdldEFkZHJlc3MgfSBmcm9tICd0ZW5kZXJtaW50L2xpYi9wdWJrZXkuanMnO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IENoYWluLCBDaGFpblN0YXRlcyB9IGZyb20gJy4uL2NoYWluLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSAnLi4vLi4vdm90aW5nLXBvd2VyL2hpc3RvcnkuanMnO1xuXG5maW5kVm90aW5nUG93ZXIgPSAodmFsaWRhdG9yLCBnZW5WYWxpZGF0b3JzKSA9PiB7XG4gICAgZm9yIChsZXQgdiBpbiBnZW5WYWxpZGF0b3JzKXtcbiAgICAgICAgaWYgKHZhbGlkYXRvci5wdWJfa2V5LnZhbHVlID09IGdlblZhbGlkYXRvcnNbdl0ucHViX2tleS52YWx1ZSl7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoZ2VuVmFsaWRhdG9yc1t2XS5wb3dlcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgICAnY2hhaW4uZ2V0Q29uc2Vuc3VzU3RhdGUnOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHVybCA9IFJQQysnL2R1bXBfY29uc2Vuc3VzX3N0YXRlJztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGxldCBjb25zZW5zdXMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgY29uc2Vuc3VzID0gdHlwZW9mIGNvbnNlbnN1cyA9PSAnb2JqZWN0JyAmJiBjb25zZW5zdXMgIT0gbnVsbCAmJiBjb25zZW5zdXMucmVzdWx0ICE9IHVuZGVmaW5lZCA/IGNvbnNlbnN1cy5yZXN1bHQgOiBjb25zZW5zdXM7XG4gICAgICAgICAgICBsZXQgaGVpZ2h0ID0gY29uc2Vuc3VzLnJvdW5kX3N0YXRlLmhlaWdodDtcbiAgICAgICAgICAgIGxldCByb3VuZCA9IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS5yb3VuZDtcbiAgICAgICAgICAgIGxldCBzdGVwID0gY29uc2Vuc3VzLnJvdW5kX3N0YXRlLnN0ZXA7XG4gICAgICAgICAgICBsZXQgdm90ZWRQb3dlciA9IE1hdGgucm91bmQocGFyc2VGbG9hdChjb25zZW5zdXMucm91bmRfc3RhdGUudm90ZXNbcm91bmRdLnByZXZvdGVzX2JpdF9hcnJheS5zcGxpdChcIiBcIilbM10pKjEwMCk7XG5cbiAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LCB7JHNldDp7XG4gICAgICAgICAgICAgICAgdm90aW5nSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgdm90aW5nUm91bmQ6IHJvdW5kLFxuICAgICAgICAgICAgICAgIHZvdGluZ1N0ZXA6IHN0ZXAsXG4gICAgICAgICAgICAgICAgdm90ZWRQb3dlcjogdm90ZWRQb3dlcixcbiAgICAgICAgICAgICAgICBwcm9wb3NlckFkZHJlc3M6IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS52YWxpZGF0b3JzLnByb3Bvc2VyLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgcHJldm90ZXM6IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS52b3Rlc1tyb3VuZF0ucHJldm90ZXMsXG4gICAgICAgICAgICAgICAgcHJlY29tbWl0czogY29uc2Vuc3VzLnJvdW5kX3N0YXRlLnZvdGVzW3JvdW5kXS5wcmVjb21taXRzXG4gICAgICAgICAgICB9fSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5jaGFpbi5nZXRDb25zZW5zdXNTdGF0ZScpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnY2hhaW4udXBkYXRlU3RhdHVzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBSUEMrJy9zdGF0dXMnO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgbGV0IHN0YXR1cyA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICBzdGF0dXMgPSB0eXBlb2Ygc3RhdHVzID09ICdvYmplY3QnICYmIHN0YXR1cyAhPSBudWxsICYmIHN0YXR1cy5yZXN1bHQgIT0gdW5kZWZpbmVkID8gc3RhdHVzLnJlc3VsdCA6IHN0YXR1cztcbiAgICAgICAgICAgIGxldCBjaGFpbiA9IHt9O1xuICAgICAgICAgICAgY2hhaW4uY2hhaW5JZCA9IHN0YXR1cy5ub2RlX2luZm8ubmV0d29yaztcbiAgICAgICAgICAgIGNoYWluLmxhdGVzdEJsb2NrSGVpZ2h0ID0gc3RhdHVzLnN5bmNfaW5mby5sYXRlc3RfYmxvY2tfaGVpZ2h0O1xuICAgICAgICAgICAgY2hhaW4ubGF0ZXN0QmxvY2tUaW1lID0gc3RhdHVzLnN5bmNfaW5mby5sYXRlc3RfYmxvY2tfdGltZTtcblxuICAgICAgICAgICAgbGV0IGxhdGVzdFN0YXRlID0gQ2hhaW5TdGF0ZXMuZmluZE9uZSh7fSwge3NvcnQ6IHtoZWlnaHQ6IC0xfX0pXG4gICAgICAgICAgICBpZiAobGF0ZXN0U3RhdGUgJiYgbGF0ZXN0U3RhdGUuaGVpZ2h0ID49IGNoYWluLmxhdGVzdEJsb2NrSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBubyB1cGRhdGVzIChnZXR0aW5nIGJsb2NrICR7Y2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHR9IGF0IGJsb2NrICR7bGF0ZXN0U3RhdGUuaGVpZ2h0fSlgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVybCA9IFJQQysnL3ZhbGlkYXRvcnMnO1xuICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgbGV0IHZhbGlkYXRvcnMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgdmFsaWRhdG9ycyA9IHR5cGVvZiB2YWxpZGF0b3JzID09ICdvYmplY3QnICYmIHZhbGlkYXRvcnMgIT0gbnVsbCAmJiB2YWxpZGF0b3JzLnJlc3VsdCAhPSB1bmRlZmluZWQgPyB2YWxpZGF0b3JzLnJlc3VsdCA6IHZhbGlkYXRvcnM7XG4gICAgICAgICAgICB2YWxpZGF0b3JzID0gdHlwZW9mIHZhbGlkYXRvcnMgPT0gJ29iamVjdCcgJiYgdmFsaWRhdG9ycyAhPSBudWxsICYmIHZhbGlkYXRvcnMudmFsaWRhdG9ycyAhPSB1bmRlZmluZWQgPyB2YWxpZGF0b3JzLnZhbGlkYXRvcnMgOiB2YWxpZGF0b3JzO1xuICAgICAgICAgICAgY2hhaW4udmFsaWRhdG9ycyA9IHZhbGlkYXRvcnMubGVuZ3RoO1xuICAgICAgICAgICAgbGV0IGFjdGl2ZVZQID0gMDtcbiAgICAgICAgICAgIGZvciAodiBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVWUCArPSBwYXJzZUludCh2YWxpZGF0b3JzW3ZdLnZvdGluZ19wb3dlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGFpbi5hY3RpdmVWb3RpbmdQb3dlciA9IGFjdGl2ZVZQO1xuXG5cbiAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpjaGFpbi5jaGFpbklkfSwgeyRzZXQ6Y2hhaW59LCB7dXBzZXJ0OiB0cnVlfSk7XG4gICAgICAgICAgICAvLyBHZXQgY2hhaW4gc3RhdGVzXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoY2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHQpID4gMCl7XG4gICAgICAgICAgICAgICAgbGV0IGNoYWluU3RhdGVzID0ge307XG4gICAgICAgICAgICAgICAgY2hhaW5TdGF0ZXMuaGVpZ2h0ID0gcGFyc2VJbnQoc3RhdHVzLnN5bmNfaW5mby5sYXRlc3RfYmxvY2tfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy50aW1lID0gbmV3IERhdGUoc3RhdHVzLnN5bmNfaW5mby5sYXRlc3RfYmxvY2tfdGltZSk7XG5cbiAgICAgICAgICAgICAgICB1cmwgPSBMQ0QgKyAnL3N0YWtpbmcvcG9vbCc7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBib25kaW5nID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhaW4uYm9uZGVkVG9rZW5zID0gYm9uZGluZy5ib25kZWRfdG9rZW5zO1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFpbi5ub3RCb25kZWRUb2tlbnMgPSBib25kaW5nLm5vdF9ib25kZWRfdG9rZW5zO1xuICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5ib25kZWRUb2tlbnMgPSBwYXJzZUludChib25kaW5nLmJvbmRlZF90b2tlbnMpO1xuICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5ub3RCb25kZWRUb2tlbnMgPSBwYXJzZUludChib25kaW5nLm5vdF9ib25kZWRfdG9rZW5zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdjaGFpbi51cGRhdGVTdGF0dXMnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1cmwgPSBMQ0QgKyAnL2Rpc3RyaWJ1dGlvbi9jb21tdW5pdHlfcG9vbCc7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcG9vbCA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIHBvb2wgPSB0eXBlb2YgcG9vbCA9PSAnb2JqZWN0JyAmJiBwb29sICE9IG51bGwgJiYgcG9vbC5yZXN1bHQgIT0gdW5kZWZpbmVkID8gcG9vbC5yZXN1bHQgOiBwb29sO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9vbCAmJiBwb29sLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhaW5TdGF0ZXMuY29tbXVuaXR5UG9vbCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9vbC5mb3JFYWNoKChhbW91bnQsIGkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5jb21tdW5pdHlQb29sLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZW5vbTogYW1vdW50LmRlbm9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbW91bnQ6IHBhcnNlRmxvYXQoYW1vdW50LmFtb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdjaGFpbi51cGRhdGVTdGF0dXMyJylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1cmwgPSBMQ0QgKyAnL21pbnRpbmcvaW5mbGF0aW9uJztcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZmxhdGlvbiA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGluZmxhdGlvbiA9IHR5cGVvZiBpbmZsYXRpb24gPT0gJ29iamVjdCcgJiYgaW5mbGF0aW9uICE9IG51bGwgJiYgaW5mbGF0aW9uLnJlc3VsdCAhPSB1bmRlZmluZWQgPyBpbmZsYXRpb24ucmVzdWx0IDogaW5mbGF0aW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbGF0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluU3RhdGVzLmluZmxhdGlvbiA9IHBhcnNlRmxvYXQoaW5mbGF0aW9uKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnY2hhaW4udXBkYXRlU3RhdHVzMycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHVybCA9IExDRCArICcvbWludGluZy9hbm51YWwtcHJvdmlzaW9ucyc7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm92aXNpb25zID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlzaW9ucyA9IHR5cGVvZiBwcm92aXNpb25zID09ICdvYmplY3QnICYmIHByb3Zpc2lvbnMgIT0gbnVsbCAmJiBwcm92aXNpb25zLnJlc3VsdCAhPSB1bmRlZmluZWQgPyBwcm92aXNpb25zLnJlc3VsdCA6IHByb3Zpc2lvbnM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm92aXNpb25zKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluU3RhdGVzLmFubnVhbFByb3Zpc2lvbnMgPSBwYXJzZUZsb2F0KHByb3Zpc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdjaGFpbi51cGRhdGVTdGF0dXM0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQ2hhaW5TdGF0ZXMuaW5zZXJ0KGNoYWluU3RhdGVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY2hhaW4udG90YWxWb3RpbmdQb3dlciA9IHRvdGFsVlA7XG5cbiAgICAgICAgICAgIC8vIHZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLmZpbmQoe30pLmZldGNoKCk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWxpZGF0b3JzKTtcbiAgICAgICAgICAgIHJldHVybiBjaGFpbi5sYXRlc3RCbG9ja0hlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnY2hhaW4udXBkYXRlU3RhdHVzNScpO1xuICAgICAgICAgICAgcmV0dXJuIFwiRXJyb3IgZ2V0dGluZyBjaGFpbiBzdGF0dXMuXCI7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjaGFpbi5nZXRMYXRlc3RTdGF0dXMnOiBmdW5jdGlvbigpe1xuICAgICAgICBDaGFpbi5maW5kKCkuc29ydCh7Y3JlYXRlZDotMX0pLmxpbWl0KDEpO1xuICAgIH0sXG4gICAgJ2NoYWluLmdlbmVzaXMnOiBmdW5jdGlvbigpe1xuICAgICAgICBsZXQgY2hhaW4gPSBDaGFpbi5maW5kT25lKHtjaGFpbklkOiBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9KTtcblxuICAgICAgICBpZiAoY2hhaW4gJiYgY2hhaW4ucmVhZEdlbmVzaXMpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0dlbmVzaXMgZmlsZSBoYXMgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgY29uc29sZS5sb2coJz09PSBTdGFydCBwcm9jZXNzaW5nIGdlbmVzaXMgZmlsZSA9PT0nKTtcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KE1ldGVvci5zZXR0aW5ncy5nZW5lc2lzRmlsZSk7XG4gICAgICAgICAgICBsZXQgZ2VuZXNpcyA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICBnZW5lc2lzID0gdHlwZW9mIGdlbmVzaXMgPT0gJ29iamVjdCcgJiYgZ2VuZXNpcyAhPSBudWxsICYmIGdlbmVzaXMucmVzdWx0ICE9IHVuZGVmaW5lZCA/IGdlbmVzaXMucmVzdWx0IDogZ2VuZXNpcztcbiAgICAgICAgICAgIGdlbmVzaXMgPSBnZW5lc2lzLmdlbmVzaXM7XG4gICAgICAgICAgICBsZXQgZGlzdHIgPSBnZW5lc2lzLmFwcF9zdGF0ZS5kaXN0ciB8fCBnZW5lc2lzLmFwcF9zdGF0ZS5kaXN0cmlidXRpb25cbiAgICAgICAgICAgIGxldCBjaGFpblBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBjaGFpbklkOiBnZW5lc2lzLmNoYWluX2lkLFxuICAgICAgICAgICAgICAgIGdlbmVzaXNUaW1lOiBnZW5lc2lzLmdlbmVzaXNfdGltZSxcbiAgICAgICAgICAgICAgICBjb25zZW5zdXNQYXJhbXM6IGdlbmVzaXMuY29uc2Vuc3VzX3BhcmFtcyxcbiAgICAgICAgICAgICAgICBhdXRoOiBnZW5lc2lzLmFwcF9zdGF0ZS5hdXRoLFxuICAgICAgICAgICAgICAgIGJhbms6IGdlbmVzaXMuYXBwX3N0YXRlLmJhbmssXG4gICAgICAgICAgICAgICAgc3Rha2luZzoge1xuICAgICAgICAgICAgICAgICAgICBwb29sOiBnZW5lc2lzLmFwcF9zdGF0ZS5zdGFraW5nLnBvb2wsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2VuZXNpcy5hcHBfc3RhdGUuc3Rha2luZy5wYXJhbXNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1pbnQ6IGdlbmVzaXMuYXBwX3N0YXRlLm1pbnQsXG4gICAgICAgICAgICAgICAgZGlzdHI6IHtcbiAgICAgICAgICAgICAgICAgICAgY29tbXVuaXR5VGF4OiBkaXN0ci5jb21tdW5pdHlfdGF4LFxuICAgICAgICAgICAgICAgICAgICBiYXNlUHJvcG9zZXJSZXdhcmQ6IGRpc3RyLmJhc2VfcHJvcG9zZXJfcmV3YXJkLFxuICAgICAgICAgICAgICAgICAgICBib251c1Byb3Bvc2VyUmV3YXJkOiBkaXN0ci5ib251c19wcm9wb3Nlcl9yZXdhcmQsXG4gICAgICAgICAgICAgICAgICAgIHdpdGhkcmF3QWRkckVuYWJsZWQ6IGRpc3RyLndpdGhkcmF3X2FkZHJfZW5hYmxlZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZ292OiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0aW5nUHJvcG9zYWxJZDogZ2VuZXNpcy5hcHBfc3RhdGUuZ292LnN0YXJ0aW5nX3Byb3Bvc2FsX2lkLFxuICAgICAgICAgICAgICAgICAgICBkZXBvc2l0UGFyYW1zOiBnZW5lc2lzLmFwcF9zdGF0ZS5nb3YuZGVwb3NpdF9wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIHZvdGluZ1BhcmFtczogZ2VuZXNpcy5hcHBfc3RhdGUuZ292LnZvdGluZ19wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIHRhbGx5UGFyYW1zOiBnZW5lc2lzLmFwcF9zdGF0ZS5nb3YudGFsbHlfcGFyYW1zXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzbGFzaGluZzp7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2VuZXNpcy5hcHBfc3RhdGUuc2xhc2hpbmcucGFyYW1zXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdXBwbHk6IGdlbmVzaXMuYXBwX3N0YXRlLnN1cHBseSxcbiAgICAgICAgICAgICAgICBjcmlzaXM6IGdlbmVzaXMuYXBwX3N0YXRlLmNyaXNpc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgbGV0IHRvdGFsVm90aW5nUG93ZXIgPSAwO1xuXG4gICAgICAgICAgICAvLyByZWFkIGdlbnR4XG4gICAgICAgICAgICBpZiAoZ2VuZXNpcy5hcHBfc3RhdGUuZ2VudXRpbCAmJiBnZW5lc2lzLmFwcF9zdGF0ZS5nZW51dGlsLmdlbnR4cyAmJiAoZ2VuZXNpcy5hcHBfc3RhdGUuZ2VudXRpbC5nZW50eHMubGVuZ3RoID4gMCkpe1xuICAgICAgICAgICAgICAgIGZvciAoaSBpbiBnZW5lc2lzLmFwcF9zdGF0ZS5nZW51dGlsLmdlbnR4cyl7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSBnZW5lc2lzLmFwcF9zdGF0ZS5nZW51dGlsLmdlbnR4c1tpXS52YWx1ZS5tc2c7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG1zZy50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChtIGluIG1zZyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobXNnW21dLnR5cGUgPT0gXCJjb3Ntb3Mtc2RrL01zZ0NyZWF0ZVZhbGlkYXRvclwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtc2dbbV0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBjb21tYW5kID0gTWV0ZW9yLnNldHRpbmdzLmJpbi5nYWlhZGVidWcrXCIgcHVia2V5IFwiK21zZ1ttXS52YWx1ZS5wdWJrZXk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc2Vuc3VzX3B1YmtleTogbXNnW21dLnZhbHVlLnB1YmtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IG1zZ1ttXS52YWx1ZS5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWlzc2lvbjogbXNnW21dLnZhbHVlLmNvbW1pc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbl9zZWxmX2RlbGVnYXRpb246IG1zZ1ttXS52YWx1ZS5taW5fc2VsZl9kZWxlZ2F0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcl9hZGRyZXNzOiBtc2dbbV0udmFsdWUudmFsaWRhdG9yX2FkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRvcl9hZGRyZXNzOiBtc2dbbV0udmFsdWUuZGVsZWdhdG9yX2FkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ19wb3dlcjogTWF0aC5mbG9vcihwYXJzZUludChtc2dbbV0udmFsdWUudmFsdWUuYW1vdW50KSAvIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuc3Rha2luZ0ZyYWN0aW9uKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgamFpbGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsVm90aW5nUG93ZXIgKz0gdmFsaWRhdG9yLnZvdGluZ19wb3dlcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwdWJrZXlWYWx1ZSA9IE1ldGVvci5jYWxsKCdiZWNoMzJUb1B1YmtleScsIG1zZ1ttXS52YWx1ZS5wdWJrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRvcnMudXBzZXJ0KHtjb25zZW5zdXNfcHVia2V5Om1zZ1ttXS52YWx1ZS5wdWJrZXl9LHZhbGlkYXRvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IucHViX2tleSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0ZW5kZXJtaW50L1B1YktleUVkMjU1MTlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOnB1YmtleVZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5hZGRyZXNzID0gZ2V0QWRkcmVzcyh2YWxpZGF0b3IucHViX2tleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmFjY3B1YiA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbGlkYXRvci5wdWJfa2V5LCBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeEFjY1B1Yik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLm9wZXJhdG9yX3B1YmtleSA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbGlkYXRvci5wdWJfa2V5LCBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeFZhbFB1Yik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVm90aW5nUG93ZXJIaXN0b3J5Lmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHZhbGlkYXRvci5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2X3ZvdGluZ19wb3dlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiB2YWxpZGF0b3Iudm90aW5nX3Bvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja190aW1lOiBnZW5lc2lzLmdlbmVzaXNfdGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVmFsaWRhdG9ycy5pbnNlcnQodmFsaWRhdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVhZCB2YWxpZGF0b3JzIGZyb20gcHJldmlvdXMgY2hhaW5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWFkIHZhbGlkYXRvcnMgZnJvbSBwcmV2aW91cyBjaGFpbicpO1xuICAgICAgICAgICAgaWYgKGdlbmVzaXMuYXBwX3N0YXRlLnN0YWtpbmcudmFsaWRhdG9ycyAmJiBnZW5lc2lzLmFwcF9zdGF0ZS5zdGFraW5nLnZhbGlkYXRvcnMubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZ2VuZXNpcy5hcHBfc3RhdGUuc3Rha2luZy52YWxpZGF0b3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgbGV0IGdlblZhbGlkYXRvcnNTZXQgPSBnZW5lc2lzLmFwcF9zdGF0ZS5zdGFraW5nLnZhbGlkYXRvcnM7XG4gICAgICAgICAgICAgICAgbGV0IGdlblZhbGlkYXRvcnMgPSBnZW5lc2lzLnZhbGlkYXRvcnM7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdiBpbiBnZW5WYWxpZGF0b3JzU2V0KXtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZ2VuVmFsaWRhdG9yc1t2XSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3IgPSBnZW5WYWxpZGF0b3JzU2V0W3ZdO1xuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuZGVsZWdhdG9yX2FkZHJlc3MgPSBNZXRlb3IuY2FsbCgnZ2V0RGVsZWdhdG9yJywgZ2VuVmFsaWRhdG9yc1NldFt2XS5vcGVyYXRvcl9hZGRyZXNzKTtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgcHVia2V5VmFsdWUgPSBNZXRlb3IuY2FsbCgnYmVjaDMyVG9QdWJrZXknLCB2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnB1Yl9rZXkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRlbmRlcm1pbnQvUHViS2V5RWQyNTUxOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOnB1YmtleVZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmFkZHJlc3MgPSBnZXRBZGRyZXNzKHZhbGlkYXRvci5wdWJfa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLnB1Yl9rZXkgPSB2YWxpZGF0b3IucHViX2tleTtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmFjY3B1YiA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbGlkYXRvci5wdWJfa2V5LCBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeEFjY1B1Yik7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci5vcGVyYXRvcl9wdWJrZXkgPSBNZXRlb3IuY2FsbCgncHVia2V5VG9CZWNoMzInLCB2YWxpZGF0b3IucHViX2tleSwgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhWYWxQdWIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvci52b3RpbmdfcG93ZXIgPSBmaW5kVm90aW5nUG93ZXIodmFsaWRhdG9yLCBnZW5WYWxpZGF0b3JzKTtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxWb3RpbmdQb3dlciArPSB2YWxpZGF0b3Iudm90aW5nX3Bvd2VyO1xuXG4gICAgICAgICAgICAgICAgICAgIFZhbGlkYXRvcnMudXBzZXJ0KHtjb25zZW5zdXNfcHVia2V5OnZhbGlkYXRvci5jb25zZW5zdXNfcHVia2V5fSx2YWxpZGF0b3IpO1xuICAgICAgICAgICAgICAgICAgICBWb3RpbmdQb3dlckhpc3RvcnkuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHZhbGlkYXRvci5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJldl92b3RpbmdfcG93ZXI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdfcG93ZXI6IHZhbGlkYXRvci52b3RpbmdfcG93ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrX3RpbWU6IGdlbmVzaXMuZ2VuZXNpc190aW1lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2hhaW5QYXJhbXMucmVhZEdlbmVzaXMgPSB0cnVlO1xuICAgICAgICAgICAgY2hhaW5QYXJhbXMuYWN0aXZlVm90aW5nUG93ZXIgPSB0b3RhbFZvdGluZ1Bvd2VyO1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IENoYWluLnVwc2VydCh7Y2hhaW5JZDpjaGFpblBhcmFtcy5jaGFpbklkfSwgeyRzZXQ6Y2hhaW5QYXJhbXN9KTtcblxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnPT09IEZpbmlzaGVkIHByb2Nlc3NpbmcgZ2VuZXNpcyBmaWxlID09PScpO1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgICdjaGFpblN0YXRlcy5oZWlnaHQyNGhDaGFuZ2UnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBxdWVyeSA9IFtdO1xuICAgICAgICBsZXQgX2RhdGEgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gMjQ7IGkrKykge1xuICAgICAgICAgICAgX2RhdGEucHVzaChtb21lbnQoKS5zdWJ0cmFjdChpLCAnaCcpKTtcbiAgICAgICAgICAgIHF1ZXJ5LnB1c2goeyB0aW1lOiB7ICRsdDogbmV3IERhdGUobW9tZW50KCkuc3VidHJhY3QoaSwgJ2gnKS50b0RhdGUoKSksICRndDogbmV3IERhdGUobW9tZW50KCkuc3VidHJhY3QoaSwgJ2gnKS5zdWJ0cmFjdCgxLCAnbWludXRlcycpLnRvRGF0ZSgpKSB9IH0pO1xuICAgICAgICB9XG4gICAgICAgIGxldCBkYXRhID0gQ2hhaW5TdGF0ZXMuZmluZCh7XG4gICAgICAgICAgICAkb3I6IHF1ZXJ5XG4gICAgICAgIH0sIHsgc29ydDogeyB0aW1lOiAtMSB9IH0pLmZldGNoKCkubWFwKHYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBib25kZWRUb2tlbnM6IHBhcnNlSW50KHYuYm9uZGVkVG9rZW5zKSxcbiAgICAgICAgICAgICAgICBub3RCb25kZWRUb2tlbnM6IHBhcnNlSW50KHYubm90Qm9uZGVkVG9rZW5zKSxcbiAgICAgICAgICAgICAgICB0aW1lOiBtb21lbnQodi50aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW0nKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIGxldCBkYXRhXzI0aCA9IFtdO1xuICAgICAgICBfLmVhY2goX2RhdGEsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSBfLmZpcnN0KF8uZmlsdGVyKGRhdGEsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9tZW50KHZhbC50aW1lKS5mb3JtYXQoJ3gnKSA8PSB2LmZvcm1hdCgneCcpICYmIG1vbWVudCh2YWwudGltZSkuZm9ybWF0KCd4JykgPj0gdi5zdWJ0cmFjdCgxLCAnbWludXRlcycpLmZvcm1hdCgneCcpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgZGF0YV8yNGgucHVzaCh2YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGF0YV8yNGg7XG4gICAgfSxcbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBDaGFpbiwgQ2hhaW5TdGF0ZXMgfSBmcm9tICcuLi9jaGFpbi5qcyc7XG5pbXBvcnQgeyBDb2luU3RhdHMgfSBmcm9tICcuLi8uLi9jb2luLXN0YXRzL2NvaW4tc3RhdHMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uLy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5cbk1ldGVvci5wdWJsaXNoKCdjaGFpblN0YXRlcy5sYXRlc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgQ2hhaW5TdGF0ZXMuZmluZCh7fSx7c29ydDp7aGVpZ2h0Oi0xfSxsaW1pdDoxfSksXG4gICAgICAgIENvaW5TdGF0cy5maW5kKHt9LHtzb3J0OntsYXN0X3VwZGF0ZWRfYXQ6LTF9LGxpbWl0OjF9KVxuICAgIF07XG59KTtcblxucHVibGlzaENvbXBvc2l0ZSgnY2hhaW4uc3RhdHVzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gQ2hhaW4uZmluZCh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9KTtcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKGNoYWluKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2ZpZWxkczp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkcmVzczoxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOjEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3JfYWRkcmVzczoxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czotMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqYWlsZWQ6MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9maWxlX3VybDoxXG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSk7IiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5cbmV4cG9ydCBjb25zdCBDaGFpbiA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdjaGFpbicpO1xuZXhwb3J0IGNvbnN0IENoYWluU3RhdGVzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2NoYWluX3N0YXRlcycpXG5cbkNoYWluLmhlbHBlcnMoe1xuICAgIHByb3Bvc2VyKCl7XG4gICAgICAgIHJldHVybiBWYWxpZGF0b3JzLmZpbmRPbmUoe2FkZHJlc3M6dGhpcy5wcm9wb3NlckFkZHJlc3N9KTtcbiAgICB9XG59KSIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCB7IENvaW5TdGF0cyB9IGZyb20gJy4uL2NvaW4tc3RhdHMuanMnO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdjb2luU3RhdHMuZ2V0Q29pblN0YXRzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBjb2luSWQgPSBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNvaW5nZWNrb0lkO1xuICAgICAgICBpZiAoY29pbklkKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBsZXQgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBub3cuc2V0TWludXRlcygwKTtcbiAgICAgICAgICAgICAgICBsZXQgdXJsID0gXCJodHRwczovL2FwaS5jb2luZ2Vja28uY29tL2FwaS92My9zaW1wbGUvcHJpY2U/aWRzPVwiK2NvaW5JZCtcIiZ2c19jdXJyZW5jaWVzPXVzZCZpbmNsdWRlX21hcmtldF9jYXA9dHJ1ZSZpbmNsdWRlXzI0aHJfdm9sPXRydWUmaW5jbHVkZV8yNGhyX2NoYW5nZT10cnVlJmluY2x1ZGVfbGFzdF91cGRhdGVkX2F0PXRydWVcIjtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSB0eXBlb2YgZGF0YSA9PSAnb2JqZWN0JyAmJiBkYXRhICE9IG51bGwgJiYgZGF0YS5yZXN1bHQgIT0gdW5kZWZpbmVkID8gZGF0YS5yZXN1bHQgOiBkYXRhO1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVtjb2luSWRdO1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjb2luU3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29pblN0YXRzLnVwc2VydCh7bGFzdF91cGRhdGVkX2F0OmRhdGEubGFzdF91cGRhdGVkX2F0fSwgeyRzZXQ6ZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsICdtZXRob2RzLmNvaW5TdGF0cy5nZXRDb2luU3RhdHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29pbmdlY2tvIElkIHByb3ZpZGVkLlwiXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjb2luU3RhdHMuZ2V0U3RhdHMnOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IGNvaW5JZCA9IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY29pbmdlY2tvSWQ7XG4gICAgICAgIGlmIChjb2luSWQpe1xuICAgICAgICAgICAgcmV0dXJuIChDb2luU3RhdHMuZmluZE9uZSh7fSx7c29ydDp7bGFzdF91cGRhdGVkX2F0Oi0xfX0pKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29pbmdlY2tvIElkIHByb3ZpZGVkLlwiO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgICdjb2luU3RhdHMucHJpY2UyNGhDaGFuZ2UnOiBmdW5jdGlvbigpe1xuICAgICAgICBsZXQgcXVlcnkgPSBbXTtcbiAgICAgICAgbGV0IF9kYXRhID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IDI0OyBpKyspIHtcbiAgICAgICAgICAgIF9kYXRhLnB1c2gobW9tZW50KCkuc3VidHJhY3QoaSwgJ2gnKSk7XG4gICAgICAgICAgICBxdWVyeS5wdXNoKHsgbGFzdF91cGRhdGVkX2F0OiB7IFxuICAgICAgICAgICAgICAgICRsdDogTWF0aC5yb3VuZChwYXJzZUludChtb21lbnQoKS5zdWJ0cmFjdChpLCAnaCcpLmZvcm1hdCgneCcpKS9NYXRoLnBvdygxMCwgMykpLCBcbiAgICAgICAgICAgICAgICAkZ3Q6IE1hdGgucm91bmQocGFyc2VJbnQobW9tZW50KCkuc3VidHJhY3QoaSwgJ2gnKS5zdWJ0cmFjdCgxMCwgJ21pbnV0ZXMnKS5mb3JtYXQoJ3gnKSkvTWF0aC5wb3coMTAsIDMpKSBcbiAgICAgICAgICAgIH0gfSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGRhdGEgPSBDb2luU3RhdHMuZmluZCh7XG4gICAgICAgICAgICAkb3I6IHF1ZXJ5XG4gICAgICAgIH0sIHsgc29ydDogeyBsYXN0X3VwZGF0ZWRfYXQ6IC0xIH0gfSkuZmV0Y2goKS5tYXAodiA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVzZDogcGFyc2VGbG9hdCh2LnVzZCksXG4gICAgICAgICAgICAgICAgbGFzdF91cGRhdGVkX2F0OiB2Lmxhc3RfdXBkYXRlZF9hdCxcbiAgICAgICAgICAgICAgICB0aW1lOiBtb21lbnQudW5peCh2Lmxhc3RfdXBkYXRlZF9hdCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tJylcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgZGF0YV8yNGggPSBbXTtcbiAgICAgICAgXy5lYWNoKF9kYXRhLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gXy5maXJzdChfLmZpbHRlcihkYXRhLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbC5sYXN0X3VwZGF0ZWRfYXQpIDw9IE1hdGgucm91bmQocGFyc2VJbnQodi5mb3JtYXQoJ3gnKSkvTWF0aC5wb3coMTAsIDMpKSAmJiBwYXJzZUludCh2YWwubGFzdF91cGRhdGVkX2F0KSA+PSBNYXRoLnJvdW5kKHBhcnNlSW50KHYuc3VidHJhY3QoMTAsICdtaW51dGVzJykuZm9ybWF0KCd4JykpL01hdGgucG93KDEwLCAzKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBkYXRhXzI0aC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkYXRhXzI0aDtcbiAgICB9XG59KTsiLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBDb2luU3RhdHMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignY29pbl9zdGF0cycpO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBEZWxlZ2F0aW9ucyB9IGZyb20gJy4uL2RlbGVnYXRpb25zLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ2RlbGVnYXRpb25zLmdldERlbGVnYXRpb25zJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB2YWxpZGF0b3JzID0gVmFsaWRhdG9ycy5maW5kKHt9KS5mZXRjaCgpO1xuICAgICAgICBsZXQgZGVsZWdhdGlvbnMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coXCI9PT0gR2V0dGluZyBkZWxlZ2F0aW9ucyA9PT1cIik7XG4gICAgICAgIGZvciAodiBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgIGlmICh2YWxpZGF0b3JzW3ZdLm9wZXJhdG9yX2FkZHJlc3Mpe1xuICAgICAgICAgICAgICAgIGxldCB1cmwgPSBMQ0QgKyAnL3N0YWtpbmcvdmFsaWRhdG9ycy8nK3ZhbGlkYXRvcnNbdl0ub3BlcmF0b3JfYWRkcmVzcytcIi9kZWxlZ2F0aW9uc1wiO1xuICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZWxlZ2F0aW9uID0gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRpb24gPSB0eXBlb2YgZGVsZWdhdGlvbiAhPSAnb2JqZWN0JyAmJiBkZWxlZ2F0aW9ucyAhPSBudWxsICYmIGRlbGVnYXRpb24ucmVzdWx0ICE9IHVuZGVmaW5lZCA/IGRlbGVnYXRpb24ucmVzdWx0IDogZGVsZWdhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRlbGVnYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZWdhdGlvbnMgPSBkZWxlZ2F0aW9ucy5jb25jYXQoZGVsZWdhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlLnN0YXR1c0NvZGUsICdtZXRob2RzLmRlbGVnYXRpb25zLmdldERlbGVnYXRpb25zMScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSwgJ21ldGhvZHMuZGVsZWdhdGlvbnMuZ2V0RGVsZWdhdGlvbnMyJyk7XG4gICAgICAgICAgICAgICAgfSAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSBpbiBkZWxlZ2F0aW9ucyl7XG4gICAgICAgICAgICBpZiAoZGVsZWdhdGlvbnNbaV0gJiYgZGVsZWdhdGlvbnNbaV0uc2hhcmVzKVxuICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zW2ldLnNoYXJlcyA9IHBhcnNlRmxvYXQoZGVsZWdhdGlvbnNbaV0uc2hhcmVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGRlbGVnYXRpb25zKTtcbiAgICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgICAgICBkZWxlZ2F0aW9uczogZGVsZWdhdGlvbnMsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIERlbGVnYXRpb25zLmluc2VydChkYXRhKTtcbiAgICB9XG4gICAgLy8gJ2Jsb2Nrcy5hdmVyYWdlQmxvY2tUaW1lJyhhZGRyZXNzKXtcbiAgICAvLyAgICAgbGV0IGJsb2NrcyA9IEJsb2Nrc2Nvbi5maW5kKHtwcm9wb3NlckFkZHJlc3M6YWRkcmVzc30pLmZldGNoKCk7XG4gICAgLy8gICAgIGxldCBoZWlnaHRzID0gYmxvY2tzLm1hcCgoYmxvY2ssIGkpID0+IHtcbiAgICAvLyAgICAgICAgIHJldHVybiBibG9jay5oZWlnaHQ7XG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgICBsZXQgYmxvY2tzU3RhdHMgPSBBbmFseXRpY3MuZmluZCh7aGVpZ2h0OnskaW46aGVpZ2h0c319KS5mZXRjaCgpO1xuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhibG9ja3NTdGF0cyk7XG5cbiAgICAvLyAgICAgbGV0IHRvdGFsQmxvY2tEaWZmID0gMDtcbiAgICAvLyAgICAgZm9yIChiIGluIGJsb2Nrc1N0YXRzKXtcbiAgICAvLyAgICAgICAgIHRvdGFsQmxvY2tEaWZmICs9IGJsb2Nrc1N0YXRzW2JdLnRpbWVEaWZmO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJldHVybiB0b3RhbEJsb2NrRGlmZi9oZWlnaHRzLmxlbmd0aDtcbiAgICAvLyB9XG59KTsiLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBEZWxlZ2F0aW9ucyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdkZWxlZ2F0aW9ucycpO1xuIiwiaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICd0cmFuc2FjdGlvbi5zdWJtaXQnOiBmdW5jdGlvbih0eEluZm8pIHtcbiAgICAgICAgY29uc3QgdXJsID0gYCR7TENEfS90eHNgO1xuICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgXCJ0eFwiOiB0eEluZm8udmFsdWUsXG4gICAgICAgICAgICBcIm1vZGVcIjogXCJzeW5jXCJcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgY29uc29sZS5sb2coYHN1Ym1pdHRpbmcgdHJhbnNhY3Rpb24ke3RpbWVzdGFtcH0gJHt1cmx9IHdpdGggZGF0YSAke0pTT04uc3RyaW5naWZ5KGRhdGEpfWApXG5cbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5wb3N0KHVybCwge2RhdGF9KTtcbiAgICAgICAgY29uc29sZS5sb2coYHJlc3BvbnNlIGZvciB0cmFuc2FjdGlvbiR7dGltZXN0YW1wfSAke3VybH06ICR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfWApXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgbGV0IGRhdGEgPSByZXNwb25zZS5kYXRhXG4gICAgICAgICAgICBpZiAoZGF0YS5jb2RlKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoZGF0YS5jb2RlLCBKU09OLnBhcnNlKGRhdGEucmF3X2xvZykubWVzc2FnZSlcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhLnR4aGFzaDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3RyYW5zYWN0aW9uLmV4ZWN1dGUnOiBmdW5jdGlvbihib2R5LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke0xDRH0vJHtwYXRofWA7XG4gICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICBcImJhc2VfcmVxXCI6IHtcbiAgICAgICAgICAgICAgICAuLi5ib2R5LFxuICAgICAgICAgICAgICAgIFwiY2hhaW5faWRcIjogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkLFxuICAgICAgICAgICAgICAgIFwic2ltdWxhdGVcIjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5wb3N0KHVybCwge2RhdGF9KTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhIDogSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3RyYW5zYWN0aW9uLnNpbXVsYXRlJzogZnVuY3Rpb24odHhNc2csIGZyb20sIHBhdGgsIGFkanVzdG1lbnQ9JzEuMicpIHtcbiAgICAgICAgY29uc3QgdXJsID0gYCR7TENEfS8ke3BhdGh9YDtcbiAgICAgICAgZGF0YSA9IHsuLi50eE1zZyxcbiAgICAgICAgICAgIFwiYmFzZV9yZXFcIjoge1xuICAgICAgICAgICAgICAgIFwiZnJvbVwiOiBmcm9tLFxuICAgICAgICAgICAgICAgIFwiY2hhaW5faWRcIjogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkLFxuICAgICAgICAgICAgICAgIFwiZ2FzX2FkanVzdG1lbnRcIjogYWRqdXN0bWVudCxcbiAgICAgICAgICAgICAgICBcInNpbXVsYXRlXCI6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5wb3N0KHVybCwge2RhdGF9KTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHJlc3BvbnNlLmRhdGEgIT0gJ3VuZGVmaW5lZCcgPyByZXNwb25zZS5kYXRhLmdhc19lc3RpbWF0ZSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkuZ2FzX2VzdGltYXRlO1xuICAgICAgICB9XG4gICAgfSxcbn0pIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHsgUHJvcG9zYWxzIH0gZnJvbSAnLi4vcHJvcG9zYWxzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuLy8gaW1wb3J0IHsgUHJvbWlzZSB9IGZyb20gJ21ldGVvci9wcm9taXNlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdwcm9wb3NhbHMuZ2V0UHJvcG9zYWxzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCB1cmwgPSBMQ0QgKyAnL2dvdi9wcm9wb3NhbHMnO1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGxldCBwcm9wb3NhbHMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgcHJvcG9zYWxzID0gdHlwZW9mIHByb3Bvc2FscyA9PSAnb2JqZWN0JyAmJiBwcm9wb3NhbHMgIT0gbnVsbCAmJiBwcm9wb3NhbHMucmVzdWx0ICE9IHVuZGVmaW5lZCA/IHByb3Bvc2Fscy5yZXN1bHQgOiBwcm9wb3NhbHM7XG5cbiAgICAgICAgICAgIGxldCBmaW5pc2hlZFByb3Bvc2FsSWRzID0gbmV3IFNldChQcm9wb3NhbHMuZmluZChcbiAgICAgICAgICAgICAgICB7XCJwcm9wb3NhbF9zdGF0dXNcIjp7JGluOltcIlBhc3NlZFwiLCBcIlJlamVjdGVkXCIsIFwiUmVtb3ZlZFwiXX19XG4gICAgICAgICAgICApLmZldGNoKCkubWFwKChwKT0+IHAucHJvcG9zYWxJZCkpO1xuXG4gICAgICAgICAgICBsZXQgcHJvcG9zYWxJZHMgPSBbXTtcbiAgICAgICAgICAgIGlmIChwcm9wb3NhbHMubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgLy8gUHJvcG9zYWxzLnVwc2VydCgpXG4gICAgICAgICAgICAgICAgY29uc3QgYnVsa1Byb3Bvc2FscyA9IFByb3Bvc2Fscy5yYXdDb2xsZWN0aW9uKCkuaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCgpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgaW4gcHJvcG9zYWxzKXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHByb3Bvc2FsID0gcHJvcG9zYWxzW2ldO1xuICAgICAgICAgICAgICAgICAgICBwcm9wb3NhbC5wcm9wb3NhbElkID0gcGFyc2VJbnQocHJvcG9zYWwucHJvcG9zYWxfaWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcG9zYWwucHJvcG9zYWxJZCA+IDAgJiYgIWZpbmlzaGVkUHJvcG9zYWxJZHMuaGFzKHByb3Bvc2FsLnByb3Bvc2FsSWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVybCA9IExDRCArICcvZ292L3Byb3Bvc2Fscy8nK3Byb3Bvc2FsLnByb3Bvc2FsSWQrJy9wcm9wb3Nlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJvcG9zZXIgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlciA9IHR5cGVvZiBwcm9wb3NlciA9PSAnb2JqZWN0JyAmJiBwcm9wb3NlciAhPSBudWxsICYmIHByb3Bvc2VyLnJlc3VsdCAhPSB1bmRlZmluZWQgPyBwcm9wb3Nlci5yZXN1bHQgOiBwcm9wb3NlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3Bvc2VyLnByb3Bvc2FsX2lkICYmIChwcm9wb3Nlci5wcm9wb3NhbF9pZCA9PSBwcm9wb3NhbC5wcm9wb3NhbF9pZCkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWwucHJvcG9zZXIgPSBwcm9wb3Nlci5wcm9wb3NlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrUHJvcG9zYWxzLmZpbmQoe3Byb3Bvc2FsSWQ6IHByb3Bvc2FsLnByb3Bvc2FsSWR9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6cHJvcG9zYWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NhbElkcy5wdXNoKHByb3Bvc2FsLnByb3Bvc2FsSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1Byb3Bvc2Fscy5maW5kKHtwcm9wb3NhbElkOiBwcm9wb3NhbC5wcm9wb3NhbElkfSkudXBzZXJ0KCkudXBkYXRlT25lKHskc2V0OnByb3Bvc2FsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWxJZHMucHVzaChwcm9wb3NhbC5wcm9wb3NhbElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLnJlc3BvbnNlLmNvbnRlbnQsICdwcm9wb3NhbHMuZ2V0UHJvcG9zYWxzMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJ1bGtQcm9wb3NhbHMuZmluZCh7cHJvcG9zYWxJZDp7JG5pbjpwcm9wb3NhbElkc30sIHByb3Bvc2FsX3N0YXR1czp7JG5pbjpbXCJQYXNzZWRcIiwgXCJSZWplY3RlZFwiLCBcIlJlbW92ZWRcIl19fSlcbiAgICAgICAgICAgICAgICAgICAgLnVwZGF0ZSh7JHNldDoge1wicHJvcG9zYWxfc3RhdHVzXCI6IFwiUmVtb3ZlZFwifX0pO1xuICAgICAgICAgICAgICAgIGJ1bGtQcm9wb3NhbHMuZXhlY3V0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAncHJvcG9zYWxzLmdldFByb3Bvc2FsczInKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb3Bvc2Fscy5nZXRQcm9wb3NhbFJlc3VsdHMnOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHByb3Bvc2FscyA9IFByb3Bvc2Fscy5maW5kKHtcInByb3Bvc2FsX3N0YXR1c1wiOnskbmluOltcIlBhc3NlZFwiLCBcIlJlamVjdGVkXCIsIFwiUmVtb3ZlZFwiXX19KS5mZXRjaCgpO1xuXG4gICAgICAgIGlmIChwcm9wb3NhbHMgJiYgKHByb3Bvc2Fscy5sZW5ndGggPiAwKSl7XG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIHByb3Bvc2Fscyl7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHByb3Bvc2Fsc1tpXS5wcm9wb3NhbElkKSA+IDApe1xuICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcG9zYWwgZGVwb3NpdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cmwgPSBMQ0QgKyAnL2dvdi9wcm9wb3NhbHMvJytwcm9wb3NhbHNbaV0ucHJvcG9zYWxJZCsnL2RlcG9zaXRzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJvcG9zYWwgPSB7cHJvcG9zYWxJZDogcHJvcG9zYWxzW2ldLnByb3Bvc2FsSWR9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGVwb3NpdHMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcG9zaXRzID0gdHlwZW9mIGRlcG9zaXRzID09ICdvYmplY3QnICYmIGRlcG9zaXRzICE9IG51bGwgJiYgZGVwb3NpdHMucmVzdWx0ICE9IHVuZGVmaW5lZCA/IGRlcG9zaXRzLnJlc3VsdCA6IGRlcG9zaXRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLmRlcG9zaXRzID0gZGVwb3NpdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IExDRCArICcvZ292L3Byb3Bvc2Fscy8nK3Byb3Bvc2Fsc1tpXS5wcm9wb3NhbElkKycvdm90ZXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdm90ZXMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVzID0gdHlwZW9mIHZvdGVzID09ICdvYmplY3QnICYmIHZvdGVzICE9IG51bGwgJiYgdm90ZXMucmVzdWx0ICE9IHVuZGVmaW5lZCA/IHZvdGVzLnJlc3VsdCA6IHZvdGVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLnZvdGVzID0gZ2V0Vm90ZURldGFpbCh2b3Rlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IExDRCArICcvZ292L3Byb3Bvc2Fscy8nK3Byb3Bvc2Fsc1tpXS5wcm9wb3NhbElkKycvdGFsbHknO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFsbHkgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhbGx5ID0gdHlwZW9mIHRhbGx5ID09ICdvYmplY3QnICYmIHRhbGx5ICE9IG51bGwgJiYgdGFsbHkucmVzdWx0ICE9IHVuZGVmaW5lZCA/IHRhbGx5LnJlc3VsdCA6IHRhbGx5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLnRhbGx5ID0gdGFsbHk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBQcm9wb3NhbHMudXBkYXRlKHtwcm9wb3NhbElkOiBwcm9wb3NhbHNbaV0ucHJvcG9zYWxJZH0sIHskc2V0OnByb3Bvc2FsfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgJ3Byb3Bvc2Fscy5hbGwnOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoUHJvcG9zYWxzLmZpbmQoe30sIHtzb3J0OiB7cHJvcG9zYWxJZDogLTF9fSkuZmV0Y2goKSk7XG4gICAgfSxcbiAgICAncHJvcG9zYWxzLnByb3Bvc2FsQnlJZCc6IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFByb3Bvc2Fscy5maW5kKHtwcm9wb3NhbF9pZDogaWR9LCB7bGltaXQ6IDF9KS5mZXRjaCgpKTtcbiAgICB9XG59KTtcblxuY29uc3QgZ2V0Vm90ZURldGFpbCA9ICh2b3RlcykgPT4ge1xuICAgIGlmICghdm90ZXMpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCB2b3RlcnMgPSB2b3Rlcy5tYXAoKHZvdGUpID0+IHZvdGUudm90ZXIpO1xuICAgIGxldCB2b3RpbmdQb3dlck1hcCA9IHt9O1xuICAgIGxldCB2YWxpZGF0b3JBZGRyZXNzTWFwID0ge307XG4gICAgVmFsaWRhdG9ycy5maW5kKHtkZWxlZ2F0b3JfYWRkcmVzczogeyRpbjogdm90ZXJzfX0pLmZvckVhY2goKHZhbGlkYXRvcikgPT4ge1xuICAgICAgICB2b3RpbmdQb3dlck1hcFt2YWxpZGF0b3IuZGVsZWdhdG9yX2FkZHJlc3NdID0ge1xuICAgICAgICAgICAgbW9uaWtlcjogdmFsaWRhdG9yLmRlc2NyaXB0aW9uLm1vbmlrZXIsXG4gICAgICAgICAgICBhZGRyZXNzOiB2YWxpZGF0b3IuYWRkcmVzcyxcbiAgICAgICAgICAgIHRva2VuczogcGFyc2VGbG9hdCh2YWxpZGF0b3IudG9rZW5zKSxcbiAgICAgICAgICAgIGRlbGVnYXRvclNoYXJlczogcGFyc2VGbG9hdCh2YWxpZGF0b3IuZGVsZWdhdG9yX3NoYXJlcyksXG4gICAgICAgICAgICBkZWR1Y3RlZFNoYXJlczogcGFyc2VGbG9hdCh2YWxpZGF0b3IuZGVsZWdhdG9yX3NoYXJlcylcbiAgICAgICAgfTtcbiAgICAgICAgdmFsaWRhdG9yQWRkcmVzc01hcFt2YWxpZGF0b3Iub3BlcmF0b3JfYWRkcmVzc10gPSB2YWxpZGF0b3IuZGVsZWdhdG9yX2FkZHJlc3M7XG4gICAgfSk7XG4gICAgdm90ZXJzLmZvckVhY2goKHZvdGVyKSA9PiB7XG4gICAgICAgIGlmICghdm90aW5nUG93ZXJNYXBbdm90ZXJdKSB7XG4gICAgICAgICAgICAvLyB2b3RlciBpcyBub3QgYSB2YWxpZGF0b3JcbiAgICAgICAgICAgIGxldCB1cmwgPSBgJHtMQ0R9L3N0YWtpbmcvZGVsZWdhdG9ycy8ke3ZvdGVyfS9kZWxlZ2F0aW9uc2A7XG4gICAgICAgICAgICBsZXQgZGVsZWdhdGlvbnM7XG4gICAgICAgICAgICBsZXQgdm90aW5nUG93ZXIgPSAwO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZWdhdGlvbnMgPSB0eXBlb2YgcmVzcG9uc2UuZGF0YSAhPSAndW5kZWZpbmVkJyA/IHJlc3BvbnNlLmRhdGEgOiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0aW9ucyA9IHR5cGVvZiBkZWxlZ2F0aW9ucyA9PSAnb2JqZWN0JyAmJiBkZWxlZ2F0aW9ucyAhPSBudWxsICYmIGRlbGVnYXRpb25zLnJlc3VsdCAhPSB1bmRlZmluZWQgPyBkZWxlZ2F0aW9ucy5yZXN1bHQgOiBkZWxlZ2F0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zLmZvckVhY2goKGRlbGVnYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcmVzID0gcGFyc2VGbG9hdChkZWxlZ2F0aW9uLnNoYXJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRvckFkZHJlc3NNYXBbZGVsZWdhdGlvbi52YWxpZGF0b3JfYWRkcmVzc10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGVkdWN0IGRlbGVnYXRlZCBzaGFyZWRzIGZyb20gdmFsaWRhdG9yIGlmIGEgZGVsZWdhdG9yIHZvdGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3IgPSB2b3RpbmdQb3dlck1hcFt2YWxpZGF0b3JBZGRyZXNzTWFwW2RlbGVnYXRpb24udmFsaWRhdG9yX2FkZHJlc3NdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmRlZHVjdGVkU2hhcmVzIC09IHNoYXJlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRvci5kZWxlZ2F0b3Jfc2hhcmVzICE9IDApeyAvLyBhdm9pZGluZyBkaXZpc2lvbiBieSB6ZXJvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdQb3dlciArPSAoc2hhcmVzL3ZhbGlkYXRvci5kZWxlZ2F0b3JTaGFyZXMpICogdmFsaWRhdG9yLnRva2VucztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7b3BlcmF0b3JfYWRkcmVzczogZGVsZWdhdGlvbi52YWxpZGF0b3JfYWRkcmVzc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRhdG9yICYmIHZhbGlkYXRvci5kZWxlZ2F0b3Jfc2hhcmVzICE9IDApeyAvLyBhdm9pZGluZyBkaXZpc2lvbiBieSB6ZXJvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdQb3dlciArPSAoc2hhcmVzL3BhcnNlRmxvYXQodmFsaWRhdG9yLmRlbGVnYXRvcl9zaGFyZXMpKSAqIHBhcnNlRmxvYXQodmFsaWRhdG9yLnRva2Vucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLCAnbWV0aG9kcy5wcm9wb3NhbHMuZ2V0Vm90ZURldGFpbCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm90aW5nUG93ZXJNYXBbdm90ZXJdID0ge3ZvdGluZ1Bvd2VyOiB2b3RpbmdQb3dlcn07XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdm90ZXMubWFwKCh2b3RlKSA9PiB7XG4gICAgICAgIGxldCB2b3RlciA9IHZvdGluZ1Bvd2VyTWFwW3ZvdGUudm90ZXJdO1xuICAgICAgICBsZXQgdm90aW5nUG93ZXIgPSB2b3Rlci52b3RpbmdQb3dlcjtcbiAgICAgICAgaWYgKHZvdGluZ1Bvd2VyID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gdm90ZXIgaXMgYSB2YWxpZGF0b3JcbiAgICAgICAgICAgIHZvdGluZ1Bvd2VyID0gdm90ZXIuZGVsZWdhdG9yU2hhcmVzPygodm90ZXIuZGVkdWN0ZWRTaGFyZXMvdm90ZXIuZGVsZWdhdG9yU2hhcmVzKSAqIHZvdGVyLnRva2Vucyk6MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gey4uLnZvdGUsIHZvdGluZ1Bvd2VyfTtcbiAgICB9KTtcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUHJvcG9zYWxzIH0gZnJvbSAnLi4vcHJvcG9zYWxzLmpzJztcbmltcG9ydCB7IGNoZWNrIH0gZnJvbSAnbWV0ZW9yL2NoZWNrJ1xuXG5NZXRlb3IucHVibGlzaCgncHJvcG9zYWxzLmxpc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFByb3Bvc2Fscy5maW5kKHt9LCB7c29ydDp7cHJvcG9zYWxJZDotMX19KTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgncHJvcG9zYWxzLm9uZScsIGZ1bmN0aW9uIChpZCl7XG4gICAgY2hlY2soaWQsIE51bWJlcik7XG4gICAgcmV0dXJuIFByb3Bvc2Fscy5maW5kKHtwcm9wb3NhbElkOmlkfSk7XG59KSIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IFByb3Bvc2FscyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdwcm9wb3NhbHMnKTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuaW1wb3J0IHsgVmFsaWRhdG9yUmVjb3JkcywgQW5hbHl0aWNzLCBBdmVyYWdlRGF0YSwgQXZlcmFnZVZhbGlkYXRvckRhdGEgfSBmcm9tICcuLi9yZWNvcmRzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9yU2V0cyB9IGZyb20gJy9pbXBvcnRzL2FwaS92YWxpZGF0b3Itc2V0cy92YWxpZGF0b3Itc2V0cy5qcyc7XG5pbXBvcnQgeyBTdGF0dXMgfSBmcm9tICcuLi8uLi9zdGF0dXMvc3RhdHVzLmpzJztcbmltcG9ydCB7IE1pc3NlZEJsb2Nrc1N0YXRzIH0gZnJvbSAnLi4vcmVjb3Jkcy5qcyc7XG5pbXBvcnQgeyBNaXNzZWRCbG9ja3MgfSBmcm9tICcuLi9yZWNvcmRzLmpzJztcbmltcG9ydCB7IEJsb2Nrc2NvbiB9IGZyb20gJy4uLy4uL2Jsb2Nrcy9ibG9ja3MuanMnO1xuaW1wb3J0IHsgQ2hhaW4gfSBmcm9tICcuLi8uLi9jaGFpbi9jaGFpbi5qcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgQlVMS1VQREFURU1BWFNJWkUgPSAxMDAwO1xuXG5jb25zdCBnZXRCbG9ja1N0YXRzID0gKHN0YXJ0SGVpZ2h0LCBsYXRlc3RIZWlnaHQpID0+IHtcbiAgICBsZXQgYmxvY2tTdGF0cyA9IHt9O1xuICAgIGNvbnN0IGNvbmQgPSB7JGFuZDogW1xuICAgICAgICB7IGhlaWdodDogeyAkZ3Q6IHN0YXJ0SGVpZ2h0IH0gfSxcbiAgICAgICAgeyBoZWlnaHQ6IHsgJGx0ZTogbGF0ZXN0SGVpZ2h0IH0gfSBdfTtcbiAgICBjb25zdCBvcHRpb25zID0ge3NvcnQ6e2hlaWdodDogMX19O1xuICAgIEJsb2Nrc2Nvbi5maW5kKGNvbmQsIG9wdGlvbnMpLmZvckVhY2goKGJsb2NrKSA9PiB7XG4gICAgICAgIGJsb2NrU3RhdHNbYmxvY2suaGVpZ2h0XSA9IHtcbiAgICAgICAgICAgIGhlaWdodDogYmxvY2suaGVpZ2h0LFxuICAgICAgICAgICAgcHJvcG9zZXJBZGRyZXNzOiBibG9jay5wcm9wb3NlckFkZHJlc3MsXG4gICAgICAgICAgICBwcmVjb21taXRzQ291bnQ6IGJsb2NrLnByZWNvbW1pdHNDb3VudCxcbiAgICAgICAgICAgIHZhbGlkYXRvcnNDb3VudDogYmxvY2sudmFsaWRhdG9yc0NvdW50LFxuICAgICAgICAgICAgdmFsaWRhdG9yczogYmxvY2sudmFsaWRhdG9ycyxcbiAgICAgICAgICAgIHRpbWU6IGJsb2NrLnRpbWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgQW5hbHl0aWNzLmZpbmQoY29uZCwgb3B0aW9ucykuZm9yRWFjaCgoYmxvY2spID0+IHtcbiAgICAgICAgaWYgKCFibG9ja1N0YXRzW2Jsb2NrLmhlaWdodF0pIHtcbiAgICAgICAgICAgIGJsb2NrU3RhdHNbYmxvY2suaGVpZ2h0XSA9IHsgaGVpZ2h0OiBibG9jay5oZWlnaHQgfTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBibG9jayAke2Jsb2NrLmhlaWdodH0gZG9lcyBub3QgaGF2ZSBhbiBlbnRyeWApO1xuICAgICAgICB9XG4gICAgICAgIF8uYXNzaWduKGJsb2NrU3RhdHNbYmxvY2suaGVpZ2h0XSwge1xuICAgICAgICAgICAgcHJlY29tbWl0czogYmxvY2sucHJlY29tbWl0cyxcbiAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWU6IGJsb2NrLmF2ZXJhZ2VCbG9ja1RpbWUsXG4gICAgICAgICAgICB0aW1lRGlmZjogYmxvY2sudGltZURpZmYsXG4gICAgICAgICAgICB2b3RpbmdfcG93ZXI6IGJsb2NrLnZvdGluZ19wb3dlclxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmxvY2tTdGF0cztcbn1cblxuY29uc3QgZ2V0UHJldmlvdXNSZWNvcmQgPSAodm90ZXJBZGRyZXNzLCBwcm9wb3NlckFkZHJlc3MpID0+IHtcbiAgICBsZXQgcHJldmlvdXNSZWNvcmQgPSBNaXNzZWRCbG9ja3MuZmluZE9uZShcbiAgICAgICAge3ZvdGVyOnZvdGVyQWRkcmVzcywgcHJvcG9zZXI6cHJvcG9zZXJBZGRyZXNzLCBibG9ja0hlaWdodDogLTF9KTtcbiAgICBsZXQgbGFzdFVwZGF0ZWRIZWlnaHQgPSBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnN0YXJ0SGVpZ2h0O1xuICAgIGxldCBwcmV2U3RhdHMgPSB7fTtcbiAgICBpZiAocHJldmlvdXNSZWNvcmQpIHtcbiAgICAgICAgcHJldlN0YXRzID0gXy5waWNrKHByZXZpb3VzUmVjb3JkLCBbJ21pc3NDb3VudCcsICd0b3RhbENvdW50J10pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByZXZTdGF0cyA9IHtcbiAgICAgICAgICAgIG1pc3NDb3VudDogMCxcbiAgICAgICAgICAgIHRvdGFsQ291bnQ6IDBcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJldlN0YXRzO1xufVxuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ1ZhbGlkYXRvclJlY29yZHMuY2FsY3VsYXRlTWlzc2VkQmxvY2tzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCFDT1VOVE1JU1NFREJMT0NLUyl7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIENPVU5UTUlTU0VEQkxPQ0tTID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FsdWxhdGUgbWlzc2VkIGJsb2NrcyBjb3VudCcpO1xuICAgICAgICAgICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3JzID0gVmFsaWRhdG9ycy5maW5kKHt9KS5mZXRjaCgpO1xuICAgICAgICAgICAgICAgIGxldCBsYXRlc3RIZWlnaHQgPSBNZXRlb3IuY2FsbCgnYmxvY2tzLmdldEN1cnJlbnRIZWlnaHQnKTtcbiAgICAgICAgICAgICAgICBsZXQgZXhwbG9yZXJTdGF0dXMgPSBTdGF0dXMuZmluZE9uZSh7Y2hhaW5JZDogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkfSk7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gKGV4cGxvcmVyU3RhdHVzJiZleHBsb3JlclN0YXR1cy5sYXN0UHJvY2Vzc2VkTWlzc2VkQmxvY2tIZWlnaHQpP2V4cGxvcmVyU3RhdHVzLmxhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja0hlaWdodDpNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnN0YXJ0SGVpZ2h0O1xuICAgICAgICAgICAgICAgIGxhdGVzdEhlaWdodCA9IE1hdGgubWluKHN0YXJ0SGVpZ2h0ICsgQlVMS1VQREFURU1BWFNJWkUsIGxhdGVzdEhlaWdodCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVsa01pc3NlZFN0YXRzID0gTWlzc2VkQmxvY2tzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplT3JkZXJlZEJ1bGtPcCgpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvcnNNYXAgPSB7fTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0b3JzLmZvckVhY2goKHZhbGlkYXRvcikgPT4gdmFsaWRhdG9yc01hcFt2YWxpZGF0b3IuYWRkcmVzc10gPSB2YWxpZGF0b3IpO1xuXG4gICAgICAgICAgICAgICAgLy8gYSBtYXAgb2YgYmxvY2sgaGVpZ2h0IHRvIGJsb2NrIHN0YXRzXG4gICAgICAgICAgICAgICAgbGV0IGJsb2NrU3RhdHMgPSBnZXRCbG9ja1N0YXRzKHN0YXJ0SGVpZ2h0LCBsYXRlc3RIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gcHJvcG9zZXJWb3RlclN0YXRzIGlzIGEgcHJvcG9zZXItdm90ZXIgbWFwIGNvdW50aW5nIG51bWJlcnMgb2YgcHJvcG9zZWQgYmxvY2tzIG9mIHdoaWNoIHZvdGVyIGlzIGFuIGFjdGl2ZSB2YWxpZGF0b3JcbiAgICAgICAgICAgICAgICBsZXQgcHJvcG9zZXJWb3RlclN0YXRzID0ge31cblxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChibG9ja1N0YXRzLCAoYmxvY2ssIGJsb2NrSGVpZ2h0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm9wb3NlckFkZHJlc3MgPSBibG9jay5wcm9wb3NlckFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2b3RlZFZhbGlkYXRvcnMgPSBuZXcgU2V0KGJsb2NrLnZhbGlkYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9yU2V0cyA9IFZhbGlkYXRvclNldHMuZmluZE9uZSh7YmxvY2tfaGVpZ2h0OmJsb2NrLmhlaWdodH0pO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdm90ZWRWb3RpbmdQb3dlciA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yU2V0cy52YWxpZGF0b3JzLmZvckVhY2goKGFjdGl2ZVZhbGlkYXRvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZvdGVkVmFsaWRhdG9ycy5oYXMoYWN0aXZlVmFsaWRhdG9yLmFkZHJlc3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVkVm90aW5nUG93ZXIgKz0gcGFyc2VGbG9hdChhY3RpdmVWYWxpZGF0b3Iudm90aW5nX3Bvd2VyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvclNldHMudmFsaWRhdG9ycy5mb3JFYWNoKChhY3RpdmVWYWxpZGF0b3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50VmFsaWRhdG9yID0gYWN0aXZlVmFsaWRhdG9yLmFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghXy5oYXMocHJvcG9zZXJWb3RlclN0YXRzLCBbcHJvcG9zZXJBZGRyZXNzLCBjdXJyZW50VmFsaWRhdG9yXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldlN0YXRzID0gZ2V0UHJldmlvdXNSZWNvcmQoY3VycmVudFZhbGlkYXRvciwgcHJvcG9zZXJBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLnNldChwcm9wb3NlclZvdGVyU3RhdHMsIFtwcm9wb3NlckFkZHJlc3MsIGN1cnJlbnRWYWxpZGF0b3JdLCBwcmV2U3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLnVwZGF0ZShwcm9wb3NlclZvdGVyU3RhdHMsIFtwcm9wb3NlckFkZHJlc3MsIGN1cnJlbnRWYWxpZGF0b3IsICd0b3RhbENvdW50J10sIChuKSA9PiBuKzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2b3RlZFZhbGlkYXRvcnMuaGFzKGN1cnJlbnRWYWxpZGF0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy51cGRhdGUocHJvcG9zZXJWb3RlclN0YXRzLCBbcHJvcG9zZXJBZGRyZXNzLCBjdXJyZW50VmFsaWRhdG9yLCAnbWlzc0NvdW50J10sIChuKSA9PiBuKzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtNaXNzZWRTdGF0cy5pbnNlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RlcjogY3VycmVudFZhbGlkYXRvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tIZWlnaHQ6IGJsb2NrLmhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zZXI6IHByb3Bvc2VyQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlY29tbWl0c0NvdW50OiBibG9jay5wcmVjb21taXRzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnNDb3VudDogYmxvY2sudmFsaWRhdG9yc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lOiBibG9jay50aW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVjb21taXRzOiBibG9jay5wcmVjb21taXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lOiBibG9jay5hdmVyYWdlQmxvY2tUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lRGlmZjogYmxvY2sudGltZURpZmYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ1Bvd2VyOiBibG9jay52b3RpbmdfcG93ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVkVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogbGF0ZXN0SGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzQ291bnQ6IF8uZ2V0KHByb3Bvc2VyVm90ZXJTdGF0cywgW3Byb3Bvc2VyQWRkcmVzcywgY3VycmVudFZhbGlkYXRvciwgJ21pc3NDb3VudCddKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxDb3VudDogXy5nZXQocHJvcG9zZXJWb3RlclN0YXRzLCBbcHJvcG9zZXJBZGRyZXNzLCBjdXJyZW50VmFsaWRhdG9yLCAndG90YWxDb3VudCddKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHByb3Bvc2VyVm90ZXJTdGF0cywgKHZvdGVycywgcHJvcG9zZXJBZGRyZXNzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2b3RlcnMsIChzdGF0cywgdm90ZXJBZGRyZXNzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWxrTWlzc2VkU3RhdHMuZmluZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90ZXI6IHZvdGVyQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlcjogcHJvcG9zZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrSGVpZ2h0OiAtMVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudXBzZXJ0KCkudXBkYXRlT25lKHskc2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90ZXI6IHZvdGVyQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlcjogcHJvcG9zZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrSGVpZ2h0OiAtMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IGxhdGVzdEhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzQ291bnQ6IF8uZ2V0KHN0YXRzLCAnbWlzc0NvdW50JyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxDb3VudDogXy5nZXQoc3RhdHMsICd0b3RhbENvdW50JylcbiAgICAgICAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChidWxrTWlzc2VkU3RhdHMubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IE1pc3NlZEJsb2Nrcy5fZHJpdmVyLm1vbmdvLmNsaWVudDtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIHRyYW5zYWN0aW9uIGJhY2sgYWZ0ZXIgcmVwbGljYSBzZXQoIzE0NikgaXMgc2V0IHVwXG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBzZXNzaW9uID0gY2xpZW50LnN0YXJ0U2Vzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXNzaW9uLnN0YXJ0VHJhbnNhY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGtQcm9taXNlID0gYnVsa01pc3NlZFN0YXRzLmV4ZWN1dGUobnVsbC8qLCB7c2Vzc2lvbn0qLykudGhlbihcbiAgICAgICAgICAgICAgICAgICAgICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKHJlc3VsdCwgZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENPVU5UTUlTU0VEQkxPQ0tTID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb21pc2UuYXdhaXQoc2Vzc2lvbi5hYm9ydFRyYW5zYWN0aW9uKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcm9taXNlLmF3YWl0KHNlc3Npb24uY29tbWl0VHJhbnNhY3Rpb24oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgKCR7cmVzdWx0LnJlc3VsdC5uSW5zZXJ0ZWR9IGluc2VydGVkLCBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJHtyZXN1bHQucmVzdWx0Lm5VcHNlcnRlZH0gdXBzZXJ0ZWQsIGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAke3Jlc3VsdC5yZXN1bHQubk1vZGlmaWVkfSBtb2RpZmllZClgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmF3YWl0KGJ1bGtQcm9taXNlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFN0YXR1cy51cHNlcnQoe2NoYWluSWQ6IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntsYXN0UHJvY2Vzc2VkTWlzc2VkQmxvY2tIZWlnaHQ6bGF0ZXN0SGVpZ2h0LCBsYXN0UHJvY2Vzc2VkTWlzc2VkQmxvY2tUaW1lOiBuZXcgRGF0ZSgpfX0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBgZG9uZSBpbiAke0RhdGUubm93KCkgLSBzdGFydFRpbWV9bXMgJHttZXNzYWdlfWA7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gXCJ1cGRhdGluZy4uLlwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnVmFsaWRhdG9yUmVjb3Jkcy5jYWxjdWxhdGVNaXNzZWRCbG9ja3NTdGF0cyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIFRPRE86IGRlcHJlY2F0ZSB0aGlzIG1ldGhvZCBhbmQgTWlzc2VkQmxvY2tzU3RhdHMgY29sbGVjdGlvblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlZhbGlkYXRvclJlY29yZHMuY2FsY3VsYXRlTWlzc2VkQmxvY2tzOiBcIitDT1VOVE1JU1NFREJMT0NLUyk7XG4gICAgICAgIGlmICghQ09VTlRNSVNTRURCTE9DS1NTVEFUUyl7XG4gICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLU1NUQVRTID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWx1bGF0ZSBtaXNzZWQgYmxvY2tzIHN0YXRzJyk7XG4gICAgICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgICAgIGxldCB2YWxpZGF0b3JzID0gVmFsaWRhdG9ycy5maW5kKHt9KS5mZXRjaCgpO1xuICAgICAgICAgICAgbGV0IGxhdGVzdEhlaWdodCA9IE1ldGVvci5jYWxsKCdibG9ja3MuZ2V0Q3VycmVudEhlaWdodCcpO1xuICAgICAgICAgICAgbGV0IGV4cGxvcmVyU3RhdHVzID0gU3RhdHVzLmZpbmRPbmUoe2NoYWluSWQ6IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0pO1xuICAgICAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gKGV4cGxvcmVyU3RhdHVzJiZleHBsb3JlclN0YXR1cy5sYXN0TWlzc2VkQmxvY2tIZWlnaHQpP2V4cGxvcmVyU3RhdHVzLmxhc3RNaXNzZWRCbG9ja0hlaWdodDpNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnN0YXJ0SGVpZ2h0O1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobGF0ZXN0SGVpZ2h0KTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0SGVpZ2h0KTtcbiAgICAgICAgICAgIGNvbnN0IGJ1bGtNaXNzZWRTdGF0cyA9IE1pc3NlZEJsb2Nrc1N0YXRzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gdmFsaWRhdG9ycyl7XG4gICAgICAgICAgICAgICAgLy8gaWYgKCh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCJCODU1MkVBQzBEMTIzQTZCRjYwOTEyMzA0N0E1MTgxRDQ1RUU5MEI1XCIpIHx8ICh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCI2OUQ5OUIyQzY2MDQzQUNCRUFBODQ0NzUyNUMzNTZBRkM2NDA4RTBDXCIpIHx8ICh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCIzNUFEN0EyQ0QyRkM3MTcxMUE2NzU4MzBFQzExNTgwODIyNzNENDU3XCIpKXtcbiAgICAgICAgICAgICAgICBsZXQgdm90ZXJBZGRyZXNzID0gdmFsaWRhdG9yc1tpXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGxldCBtaXNzZWRSZWNvcmRzID0gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKHtcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzczp2b3RlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIGV4aXN0czpmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgJGFuZDogWyB7IGhlaWdodDogeyAkZ3Q6IHN0YXJ0SGVpZ2h0IH0gfSwgeyBoZWlnaHQ6IHsgJGx0ZTogbGF0ZXN0SGVpZ2h0IH0gfSBdXG4gICAgICAgICAgICAgICAgfSkuZmV0Y2goKTtcblxuICAgICAgICAgICAgICAgIGxldCBjb3VudHMgPSB7fTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwibWlzc2VkUmVjb3JkcyB0byBwcm9jZXNzOiBcIittaXNzZWRSZWNvcmRzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yIChiIGluIG1pc3NlZFJlY29yZHMpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgYmxvY2sgPSBCbG9ja3Njb24uZmluZE9uZSh7aGVpZ2h0Om1pc3NlZFJlY29yZHNbYl0uaGVpZ2h0fSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleGlzdGluZ1JlY29yZCA9IE1pc3NlZEJsb2Nrc1N0YXRzLmZpbmRPbmUoe3ZvdGVyOnZvdGVyQWRkcmVzcywgcHJvcG9zZXI6YmxvY2sucHJvcG9zZXJBZGRyZXNzfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb3VudHNbYmxvY2sucHJvcG9zZXJBZGRyZXNzXSA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudHNbYmxvY2sucHJvcG9zZXJBZGRyZXNzXSA9IGV4aXN0aW5nUmVjb3JkLmNvdW50KzE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50c1tibG9jay5wcm9wb3NlckFkZHJlc3NdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRzW2Jsb2NrLnByb3Bvc2VyQWRkcmVzc10rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvciAoYWRkcmVzcyBpbiBjb3VudHMpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVyOiB2b3RlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlcjphZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IGNvdW50c1thZGRyZXNzXVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYnVsa01pc3NlZFN0YXRzLmZpbmQoe3ZvdGVyOnZvdGVyQWRkcmVzcywgcHJvcG9zZXI6YWRkcmVzc30pLnVwc2VydCgpLnVwZGF0ZU9uZSh7JHNldDpkYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYnVsa01pc3NlZFN0YXRzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgIGJ1bGtNaXNzZWRTdGF0cy5leGVjdXRlKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1NTVEFUUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLCAnbWV0aG9kcy5yZWNvcmRzLlZhbGlkYXRvclJlY29yZHMuY2FsY3VsYXRlTWlzc2VkQmxvY2tzU3RhdHMnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0YXR1cy51cHNlcnQoe2NoYWluSWQ6IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntsYXN0TWlzc2VkQmxvY2tIZWlnaHQ6bGF0ZXN0SGVpZ2h0LCBsYXN0TWlzc2VkQmxvY2tUaW1lOiBuZXcgRGF0ZSgpfX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1NTVEFUUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkb25lXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLU1NUQVRTID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gXCJ1cGRhdGluZy4uLlwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnQW5hbHl0aWNzLmFnZ3JlZ2F0ZUJsb2NrVGltZUFuZFZvdGluZ1Bvd2VyJzogZnVuY3Rpb24odGltZSl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICBpZiAodGltZSA9PSAnbScpe1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VCbG9ja1RpbWUgPSAwO1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VWb3RpbmdQb3dlciA9IDA7XG5cbiAgICAgICAgICAgIGxldCBhbmFseXRpY3MgPSBBbmFseXRpY3MuZmluZCh7IFwidGltZVwiOiB7ICRndDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDYwICogMTAwMCkgfSB9KS5mZXRjaCgpO1xuICAgICAgICAgICAgaWYgKGFuYWx5dGljcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gYW5hbHl0aWNzKXtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSArPSBhbmFseXRpY3NbaV0udGltZURpZmY7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciArPSBhbmFseXRpY3NbaV0udm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lID0gYXZlcmFnZUJsb2NrVGltZSAvIGFuYWx5dGljcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyID0gYXZlcmFnZVZvdGluZ1Bvd2VyIC8gYW5hbHl0aWNzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LHskc2V0OntsYXN0TWludXRlVm90aW5nUG93ZXI6YXZlcmFnZVZvdGluZ1Bvd2VyLCBsYXN0TWludXRlQmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGltZSA9PSAnaCcpe1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VCbG9ja1RpbWUgPSAwO1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VWb3RpbmdQb3dlciA9IDA7XG4gICAgICAgICAgICBsZXQgYW5hbHl0aWNzID0gQW5hbHl0aWNzLmZpbmQoeyBcInRpbWVcIjogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSA2MCo2MCAqIDEwMDApIH0gfSkuZmV0Y2goKTtcbiAgICAgICAgICAgIGlmIChhbmFseXRpY3MubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgZm9yIChpIGluIGFuYWx5dGljcyl7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgKz0gYW5hbHl0aWNzW2ldLnRpbWVEaWZmO1xuICAgICAgICAgICAgICAgICAgICBhdmVyYWdlVm90aW5nUG93ZXIgKz0gYW5hbHl0aWNzW2ldLnZvdGluZ19wb3dlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSA9IGF2ZXJhZ2VCbG9ja1RpbWUgLyBhbmFseXRpY3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciA9IGF2ZXJhZ2VWb3RpbmdQb3dlciAvIGFuYWx5dGljcy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBDaGFpbi51cGRhdGUoe2NoYWluSWQ6TWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkfSx7JHNldDp7bGFzdEhvdXJWb3RpbmdQb3dlcjphdmVyYWdlVm90aW5nUG93ZXIsIGxhc3RIb3VyQmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aW1lID09ICdkJyl7XG4gICAgICAgICAgICBsZXQgYXZlcmFnZUJsb2NrVGltZSA9IDA7XG4gICAgICAgICAgICBsZXQgYXZlcmFnZVZvdGluZ1Bvd2VyID0gMDtcbiAgICAgICAgICAgIGxldCBhbmFseXRpY3MgPSBBbmFseXRpY3MuZmluZCh7IFwidGltZVwiOiB7ICRndDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDI0KjYwKjYwICogMTAwMCkgfSB9KS5mZXRjaCgpO1xuICAgICAgICAgICAgaWYgKGFuYWx5dGljcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gYW5hbHl0aWNzKXtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSArPSBhbmFseXRpY3NbaV0udGltZURpZmY7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciArPSBhbmFseXRpY3NbaV0udm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lID0gYXZlcmFnZUJsb2NrVGltZSAvIGFuYWx5dGljcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyID0gYXZlcmFnZVZvdGluZ1Bvd2VyIC8gYW5hbHl0aWNzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LHskc2V0OntsYXN0RGF5Vm90aW5nUG93ZXI6YXZlcmFnZVZvdGluZ1Bvd2VyLCBsYXN0RGF5QmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJldHVybiBhbmFseXRpY3MubGVuZ3RoO1xuICAgIH0sXG4gICAgJ0FuYWx5dGljcy5hZ2dyZWdhdGVWYWxpZGF0b3JEYWlseUJsb2NrVGltZSc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgdmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMuZmluZCh7fSkuZmV0Y2goKTtcbiAgICAgICAgbGV0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGZvciAoaSBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgIGxldCBhdmVyYWdlQmxvY2tUaW1lID0gMDtcblxuICAgICAgICAgICAgbGV0IGJsb2NrcyA9IEJsb2Nrc2Nvbi5maW5kKHtwcm9wb3NlckFkZHJlc3M6dmFsaWRhdG9yc1tpXS5hZGRyZXNzLCBcInRpbWVcIjogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSAyNCo2MCo2MCAqIDEwMDApIH19LCB7ZmllbGRzOntoZWlnaHQ6MX19KS5mZXRjaCgpO1xuXG4gICAgICAgICAgICBpZiAoYmxvY2tzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgIGxldCBibG9ja0hlaWdodHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGIgaW4gYmxvY2tzKXtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tIZWlnaHRzLnB1c2goYmxvY2tzW2JdLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGFuYWx5dGljcyA9IEFuYWx5dGljcy5maW5kKHtoZWlnaHQ6IHskaW46YmxvY2tIZWlnaHRzfX0sIHtmaWVsZHM6e2hlaWdodDoxLHRpbWVEaWZmOjF9fSkuZmV0Y2goKTtcblxuXG4gICAgICAgICAgICAgICAgZm9yIChhIGluIGFuYWx5dGljcyl7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgKz0gYW5hbHl0aWNzW2FdLnRpbWVEaWZmO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgPSBhdmVyYWdlQmxvY2tUaW1lIC8gYW5hbHl0aWNzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQXZlcmFnZVZhbGlkYXRvckRhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICBwcm9wb3NlckFkZHJlc3M6IHZhbGlkYXRvcnNbaV0uYWRkcmVzcyxcbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lOiBhdmVyYWdlQmxvY2tUaW1lLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdWYWxpZGF0b3JEYWlseUF2ZXJhZ2VCbG9ja1RpbWUnLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSlcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgVmFsaWRhdG9yUmVjb3JkcywgQW5hbHl0aWNzLCBNaXNzZWRCbG9ja3MsIE1pc3NlZEJsb2Nrc1N0YXRzLCBWUERpc3RyaWJ1dGlvbnMgfSBmcm9tICcuLi9yZWNvcmRzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5NZXRlb3IucHVibGlzaCgndmFsaWRhdG9yX3JlY29yZHMuYWxsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBWYWxpZGF0b3JSZWNvcmRzLmZpbmQoKTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgndmFsaWRhdG9yX3JlY29yZHMudXB0aW1lJywgZnVuY3Rpb24oYWRkcmVzcywgbnVtKXtcbiAgICByZXR1cm4gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKHthZGRyZXNzOmFkZHJlc3N9LHtsaW1pdDpudW0sIHNvcnQ6e2hlaWdodDotMX19KTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgnYW5hbHl0aWNzLmhpc3RvcnknLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBBbmFseXRpY3MuZmluZCh7fSx7c29ydDp7aGVpZ2h0Oi0xfSxsaW1pdDo1MH0pO1xufSk7XG5cbk1ldGVvci5wdWJsaXNoKCd2cERpc3RyaWJ1dGlvbi5sYXRlc3QnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBWUERpc3RyaWJ1dGlvbnMuZmluZCh7fSx7c29ydDp7aGVpZ2h0Oi0xfSwgbGltaXQ6MX0pO1xufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ21pc3NlZGJsb2Nrcy52YWxpZGF0b3InLCBmdW5jdGlvbihhZGRyZXNzLCB0eXBlKXtcbiAgICBsZXQgY29uZGl0aW9ucyA9IHt9O1xuICAgIGlmICh0eXBlID09ICd2b3Rlcicpe1xuICAgICAgICBjb25kaXRpb25zID0ge1xuICAgICAgICAgICAgdm90ZXI6IGFkZHJlc3NcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgICBjb25kaXRpb25zID0ge1xuICAgICAgICAgICAgcHJvcG9zZXI6IGFkZHJlc3NcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gTWlzc2VkQmxvY2tzU3RhdHMuZmluZChjb25kaXRpb25zKVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQoc3RhdHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnthZGRyZXNzOjEsIGRlc2NyaXB0aW9uOjEsIHByb2ZpbGVfdXJsOjF9fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ21pc3NlZHJlY29yZHMudmFsaWRhdG9yJywgZnVuY3Rpb24oYWRkcmVzcywgdHlwZSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIE1pc3NlZEJsb2Nrcy5maW5kKFxuICAgICAgICAgICAgICAgIHtbdHlwZV06IGFkZHJlc3N9LFxuICAgICAgICAgICAgICAgIHtzb3J0OiB7dXBkYXRlZEF0OiAtMX19XG4gICAgICAgICAgICApXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnthZGRyZXNzOjEsIGRlc2NyaXB0aW9uOjEsIG9wZXJhdG9yX2FkZHJlc3M6MX19XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KTtcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMnO1xuXG5leHBvcnQgY29uc3QgVmFsaWRhdG9yUmVjb3JkcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2YWxpZGF0b3JfcmVjb3JkcycpO1xuZXhwb3J0IGNvbnN0IEFuYWx5dGljcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdhbmFseXRpY3MnKTtcbmV4cG9ydCBjb25zdCBNaXNzZWRCbG9ja3NTdGF0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdtaXNzZWRfYmxvY2tzX3N0YXRzJyk7XG5leHBvcnQgY29uc3QgTWlzc2VkQmxvY2tzID0gbmV3ICBNb25nby5Db2xsZWN0aW9uKCdtaXNzZWRfYmxvY2tzJyk7XG5leHBvcnQgY29uc3QgVlBEaXN0cmlidXRpb25zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3ZvdGluZ19wb3dlcl9kaXN0cmlidXRpb25zJyk7XG5leHBvcnQgY29uc3QgQXZlcmFnZURhdGEgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYXZlcmFnZV9kYXRhJyk7XG5leHBvcnQgY29uc3QgQXZlcmFnZVZhbGlkYXRvckRhdGEgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYXZlcmFnZV92YWxpZGF0b3JfZGF0YScpO1xuXG5NaXNzZWRCbG9ja3NTdGF0cy5oZWxwZXJzKHtcbiAgICBwcm9wb3Nlck1vbmlrZXIoKXtcbiAgICAgICAgbGV0IHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7YWRkcmVzczp0aGlzLnByb3Bvc2VyfSk7XG4gICAgICAgIHJldHVybiAodmFsaWRhdG9yLmRlc2NyaXB0aW9uKT92YWxpZGF0b3IuZGVzY3JpcHRpb24ubW9uaWtlcjp0aGlzLnByb3Bvc2VyO1xuICAgIH0sXG4gICAgdm90ZXJNb25pa2VyKCl7XG4gICAgICAgIGxldCB2YWxpZGF0b3IgPSBWYWxpZGF0b3JzLmZpbmRPbmUoe2FkZHJlc3M6dGhpcy52b3Rlcn0pO1xuICAgICAgICByZXR1cm4gKHZhbGlkYXRvci5kZXNjcmlwdGlvbik/dmFsaWRhdG9yLmRlc2NyaXB0aW9uLm1vbmlrZXI6dGhpcy52b3RlcjtcbiAgICB9XG59KVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBTdGF0dXMgfSBmcm9tICcuLi9zdGF0dXMuanMnO1xuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snXG5cbk1ldGVvci5wdWJsaXNoKCdzdGF0dXMuc3RhdHVzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBTdGF0dXMuZmluZCh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9KTtcbn0pO1xuXG4iLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBTdGF0dXMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignc3RhdHVzJyk7IiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHsgVHJhbnNhY3Rpb25zIH0gZnJvbSAnLi4vLi4vdHJhbnNhY3Rpb25zL3RyYW5zYWN0aW9ucy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IFZvdGluZ1Bvd2VySGlzdG9yeSB9IGZyb20gJy4uLy4uL3ZvdGluZy1wb3dlci9oaXN0b3J5LmpzJztcblxuY29uc3QgQWRkcmVzc0xlbmd0aCA9IDQwO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ1RyYW5zYWN0aW9ucy5pbmRleCc6IGZ1bmN0aW9uKGhhc2gsIGJsb2NrVGltZSl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBoYXNoID0gaGFzaC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBsZXQgdXJsID0gTENEKyAnL3R4cy8nK2hhc2g7XG4gICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgIGxldCB0eCA9IHR5cGVvZiByZXNwb25zZS5kYXRhICE9ICd1bmRlZmluZWQnID8gcmVzcG9uc2UuZGF0YSA6IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgIHR4ID0gdHlwZW9mIHR4ID09ICdvYmplY3QnICYmIHR4ICE9IG51bGwgJiYgdHgucmVzdWx0ICE9IHVuZGVmaW5lZCA/IHR4LnJlc3VsdCA6IHR4O1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGhhc2gsICdtZXRob2RzLnRyYW5zYWN0aW9uLlRyYW5zYWN0aW9ucy5pbmRleCcpO1xuXG4gICAgICAgIHR4LmhlaWdodCA9IHBhcnNlSW50KHR4LmhlaWdodCk7XG5cbiAgICAgICAgLy8gaWYgKCF0eC5jb2RlKXtcbiAgICAgICAgLy8gICAgIGxldCBtc2cgPSB0eC50eC52YWx1ZS5tc2c7XG4gICAgICAgIC8vICAgICBmb3IgKGxldCBtIGluIG1zZyl7XG4gICAgICAgIC8vICAgICAgICAgaWYgKG1zZ1ttXS50eXBlID09IFwiY29zbW9zLXNkay9Nc2dDcmVhdGVWYWxpZGF0b3JcIil7XG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1zZ1ttXS52YWx1ZSk7XG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCBjb21tYW5kID0gTWV0ZW9yLnNldHRpbmdzLmJpbi5nYWlhZGVidWcrXCIgcHVia2V5IFwiK21zZ1ttXS52YWx1ZS5wdWJrZXk7XG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCB2YWxpZGF0b3IgPSB7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb25zZW5zdXNfcHVia2V5OiBtc2dbbV0udmFsdWUucHVia2V5LFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IG1zZ1ttXS52YWx1ZS5kZXNjcmlwdGlvbixcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGNvbW1pc3Npb246IG1zZ1ttXS52YWx1ZS5jb21taXNzaW9uLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgbWluX3NlbGZfZGVsZWdhdGlvbjogbXNnW21dLnZhbHVlLm1pbl9zZWxmX2RlbGVnYXRpb24sXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBvcGVyYXRvcl9hZGRyZXNzOiBtc2dbbV0udmFsdWUudmFsaWRhdG9yX2FkZHJlc3MsXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBkZWxlZ2F0b3JfYWRkcmVzczogbXNnW21dLnZhbHVlLmRlbGVnYXRvcl9hZGRyZXNzLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiBNYXRoLmZsb29yKHBhcnNlSW50KG1zZ1ttXS52YWx1ZS52YWx1ZS5hbW91bnQpIC8gMTAwMDAwMClcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxuXG4gICAgICAgIC8vICAgICAgICAgICAgIE1ldGVvci5jYWxsKCdydW5Db2RlJywgY29tbWFuZCwgZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCl7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuYWRkcmVzcyA9IHJlc3VsdC5tYXRjaCgvXFxzWzAtOUEtRl17NDB9JC9pZ20pO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmFkZHJlc3MgPSB2YWxpZGF0b3IuYWRkcmVzc1swXS50cmltKCk7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuaGV4ID0gcmVzdWx0Lm1hdGNoKC9cXHNbMC05QS1GXXs2NH0kL2lnbSk7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuaGV4ID0gdmFsaWRhdG9yLmhleFswXS50cmltKCk7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWxpZGF0b3IucHViX2tleSA9IHJlc3VsdC5tYXRjaCgve1wiLipcIn0vaWdtKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHZhbGlkYXRvci5wdWJfa2V5ID0gSlNPTi5wYXJzZSh2YWxpZGF0b3IucHViX2tleVswXS50cmltKCkpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgbGV0IHJlID0gbmV3IFJlZ0V4cChNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeEFjY1B1YitcIi4qJFwiLFwiaWdtXCIpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmNvc21vc2FjY3B1YiA9IHJlc3VsdC5tYXRjaChyZSk7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWxpZGF0b3IuY29zbW9zYWNjcHViID0gdmFsaWRhdG9yLmNvc21vc2FjY3B1YlswXS50cmltKCk7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICByZSA9IG5ldyBSZWdFeHAoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhWYWxQdWIrXCIuKiRcIixcImlnbVwiKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHZhbGlkYXRvci5vcGVyYXRvcl9wdWJrZXkgPSByZXN1bHQubWF0Y2gocmUpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLm9wZXJhdG9yX3B1YmtleSA9IHZhbGlkYXRvci5vcGVyYXRvcl9wdWJrZXlbMF0udHJpbSgpO1xuXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBWYWxpZGF0b3JzLnVwc2VydCh7Y29uc2Vuc3VzX3B1YmtleTptc2dbbV0udmFsdWUucHVia2V5fSx2YWxpZGF0b3IpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgVm90aW5nUG93ZXJIaXN0b3J5Lmluc2VydCh7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgYWRkcmVzczogdmFsaWRhdG9yLmFkZHJlc3MsXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgcHJldl92b3RpbmdfcG93ZXI6IDAsXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiB2YWxpZGF0b3Iudm90aW5nX3Bvd2VyLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhZGQnLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdHguaGVpZ2h0KzIsXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgYmxvY2tfdGltZTogYmxvY2tUaW1lXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgLy8gICAgICAgICAgICAgfSlcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuXG4gICAgICAgIGxldCB0eElkID0gVHJhbnNhY3Rpb25zLmluc2VydCh0eCk7XG4gICAgICAgIGlmICh0eElkKXtcbiAgICAgICAgICAgIHJldHVybiB0eElkO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgJ1RyYW5zYWN0aW9ucy5maW5kRGVsZWdhdGlvbic6IGZ1bmN0aW9uKGFkZHJlc3MsIGhlaWdodCl7XG4gICAgICAgIC8vIGZvbGxvd2luZyBjb3Ntb3Mtc2RrL3gvc2xhc2hpbmcvc3BlYy8wNl9ldmVudHMubWQgYW5kIGNvc21vcy1zZGsveC9zdGFraW5nL3NwZWMvMDZfZXZlbnRzLm1kXG4gICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZCh7XG4gICAgICAgICAgICAkb3I6IFt7JGFuZDogW1xuICAgICAgICAgICAgICAgIHtcImV2ZW50cy50eXBlXCI6IFwiZGVsZWdhdGVcIn0sXG4gICAgICAgICAgICAgICAge1wiZXZlbnRzLmF0dHJpYnV0ZXMua2V5XCI6IFwidmFsaWRhdG9yXCJ9LFxuICAgICAgICAgICAgICAgIHtcImV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6IGFkZHJlc3N9XG4gICAgICAgICAgICBdfSwgeyRhbmQ6W1xuICAgICAgICAgICAgICAgIHtcImV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcImFjdGlvblwifSxcbiAgICAgICAgICAgICAgICB7XCJldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOiBcInVuamFpbFwifSxcbiAgICAgICAgICAgICAgICB7XCJldmVudHMuYXR0cmlidXRlcy5rZXlcIjogXCJzZW5kZXJcIn0sXG4gICAgICAgICAgICAgICAge1wiZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjogYWRkcmVzc31cbiAgICAgICAgICAgIF19LCB7JGFuZDpbXG4gICAgICAgICAgICAgICAge1wiZXZlbnRzLnR5cGVcIjogXCJjcmVhdGVfdmFsaWRhdG9yXCJ9LFxuICAgICAgICAgICAgICAgIHtcImV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcInZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOiBhZGRyZXNzfVxuICAgICAgICAgICAgXX0sIHskYW5kOltcbiAgICAgICAgICAgICAgICB7XCJldmVudHMudHlwZVwiOiBcInVuYm9uZFwifSxcbiAgICAgICAgICAgICAgICB7XCJldmVudHMuYXR0cmlidXRlcy5rZXlcIjogXCJ2YWxpZGF0b3JcIn0sXG4gICAgICAgICAgICAgICAge1wiZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjogYWRkcmVzc31cbiAgICAgICAgICAgIF19LCB7JGFuZDpbXG4gICAgICAgICAgICAgICAge1wiZXZlbnRzLnR5cGVcIjogXCJyZWRlbGVnYXRlXCJ9LFxuICAgICAgICAgICAgICAgIHtcImV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcImRlc3RpbmF0aW9uX3ZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOiBhZGRyZXNzfVxuICAgICAgICAgICAgXX1dLFxuICAgICAgICAgICAgXCJjb2RlXCI6IHskZXhpc3RzOiBmYWxzZX0sXG4gICAgICAgICAgICBoZWlnaHQ6eyRsdDpoZWlnaHR9fSxcbiAgICAgICAge3NvcnQ6e2hlaWdodDotMX0sXG4gICAgICAgICAgICBsaW1pdDogMX1cbiAgICAgICAgKS5mZXRjaCgpO1xuICAgIH0sXG4gICAgJ1RyYW5zYWN0aW9ucy5maW5kVXNlcic6IGZ1bmN0aW9uKGFkZHJlc3MsIGZpZWxkcz1udWxsKXtcbiAgICAgICAgLy8gYWRkcmVzcyBpcyBlaXRoZXIgZGVsZWdhdG9yIGFkZHJlc3Mgb3IgdmFsaWRhdG9yIG9wZXJhdG9yIGFkZHJlc3NcbiAgICAgICAgbGV0IHZhbGlkYXRvcjtcbiAgICAgICAgaWYgKCFmaWVsZHMpXG4gICAgICAgICAgICBmaWVsZHMgPSB7YWRkcmVzczoxLCBkZXNjcmlwdGlvbjoxLCBvcGVyYXRvcl9hZGRyZXNzOjEsIGRlbGVnYXRvcl9hZGRyZXNzOjF9O1xuICAgICAgICBpZiAoYWRkcmVzcy5pbmNsdWRlcyhNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeFZhbEFkZHIpKXtcbiAgICAgICAgICAgIC8vIHZhbGlkYXRvciBvcGVyYXRvciBhZGRyZXNzXG4gICAgICAgICAgICB2YWxpZGF0b3IgPSBWYWxpZGF0b3JzLmZpbmRPbmUoe29wZXJhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtmaWVsZHN9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRyZXNzLmluY2x1ZGVzKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4QWNjQWRkcikpe1xuICAgICAgICAgICAgLy8gZGVsZWdhdG9yIGFkZHJlc3NcbiAgICAgICAgICAgIHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7ZGVsZWdhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtmaWVsZHN9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRyZXNzLmxlbmd0aCA9PT0gQWRkcmVzc0xlbmd0aCkge1xuICAgICAgICAgICAgdmFsaWRhdG9yID0gVmFsaWRhdG9ycy5maW5kT25lKHthZGRyZXNzOmFkZHJlc3N9LCB7ZmllbGRzfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbGlkYXRvcil7XG4gICAgICAgICAgICByZXR1cm4gdmFsaWRhdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH0sXG4gICAgXG4gICAgJ1RyYW5zYWN0aW9ucy5kZXRhaWxCeUhhc2gnOiBmdW5jdGlvbihoYXNoKXtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFRyYW5zYWN0aW9ucy5maW5kKHt0eGhhc2g6aGFzaH0pLmZldGNoKCkpO1xuICAgIH0sXG4gICAgJ1RyYW5zYWN0aW9ucy5maW5kQnlIZWlnaHQnOiBmdW5jdGlvbihoZWlnaHQpe1xuICAgICAgICByZXR1cm4gVHJhbnNhY3Rpb25zLmZpbmQoe2hlaWdodDogaGVpZ2h0fSwge3NvcnQ6IHt0aW1lc3RhbXA6IC0xfX0pLmZldGNoKCk7XG4gICAgfSxcbiAgICAnVHJhbnNhY3Rpb25zLnBhZ2luYXRpb24nOiBmdW5jdGlvbihwYWdlLCBsaW1pdCl7XG4gICAgICAgIGxldCBjb3VudEFsbCA9IFRyYW5zYWN0aW9ucy5maW5kKCkuY291bnQoKTtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgcGFnaW5hdGlvbjoge1xuICAgICAgICAgICAgICAgIHRvdGFsX3BhZ2U6IE1hdGgucm91bmQoY291bnRBbGwvbGltaXQpLFxuICAgICAgICAgICAgICAgIHRvdGFsX3JlY29yZDogY291bnRBbGwsXG4gICAgICAgICAgICAgICAgY3VycmVudF9wYWdlOiBwYWdlLFxuICAgICAgICAgICAgICAgIGZyb206IChwYWdlIC0gMSkgKiBsaW1pdCArIDEsXG4gICAgICAgICAgICAgICAgdG86IHBhZ2UgKiBsaW1pdFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBsZXQgb2Zmc2V0ID0gcGFnZSAqIGxpbWl0O1xuICAgICAgICByZXNwb25zZS5kYXRhID0gVHJhbnNhY3Rpb25zLmZpbmQoe30sIHtzb3J0OiB7aGVpZ2h0OiAtMX0sIHNraXA6IG9mZnNldCwgbGltaXQ6bGltaXR9KS5mZXRjaCgpO1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi90cmFuc2FjdGlvbnMuanMnO1xuaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnLi4vLi4vYmxvY2tzL2Jsb2Nrcy5qcyc7XG5cblxucHVibGlzaENvbXBvc2l0ZSgndHJhbnNhY3Rpb25zLmxpc3QnLCBmdW5jdGlvbihsaW1pdCA9IDMwKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gVHJhbnNhY3Rpb25zLmZpbmQoe30se3NvcnQ6e2hlaWdodDotMX0sIGxpbWl0OmxpbWl0fSlcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKHR4KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge2hlaWdodDp0eC5oZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2ZpZWxkczp7dGltZToxLCBoZWlnaHQ6MX19XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KTtcblxucHVibGlzaENvbXBvc2l0ZSgndHJhbnNhY3Rpb25zLnZhbGlkYXRvcicsIGZ1bmN0aW9uKHZhbGlkYXRvckFkZHJlc3MsIGRlbGVnYXRvckFkZHJlc3MsIGxpbWl0PTEwMCl7XG4gICAgbGV0IHF1ZXJ5ID0ge307XG4gICAgaWYgKHZhbGlkYXRvckFkZHJlc3MgJiYgZGVsZWdhdG9yQWRkcmVzcyl7XG4gICAgICAgIHF1ZXJ5ID0geyRvcjpbe1wiZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjp2YWxpZGF0b3JBZGRyZXNzfSwge1wiZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjpkZWxlZ2F0b3JBZGRyZXNzfV19XG4gICAgfVxuXG4gICAgaWYgKCF2YWxpZGF0b3JBZGRyZXNzICYmIGRlbGVnYXRvckFkZHJlc3Mpe1xuICAgICAgICBxdWVyeSA9IHtcImV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6ZGVsZWdhdG9yQWRkcmVzc31cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gVHJhbnNhY3Rpb25zLmZpbmQocXVlcnksIHtzb3J0OntoZWlnaHQ6LTF9LCBsaW1pdDpsaW1pdH0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKHR4KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge2hlaWdodDp0eC5oZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2ZpZWxkczp7dGltZToxLCBoZWlnaHQ6MX19XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KVxuXG5wdWJsaXNoQ29tcG9zaXRlKCd0cmFuc2FjdGlvbnMuZmluZE9uZScsIGZ1bmN0aW9uKGhhc2gpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZCh7dHhoYXNoOmhhc2h9KVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQodHgpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2tzY29uLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICB7aGVpZ2h0OnR4LmhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnt0aW1lOjEsIGhlaWdodDoxfX1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pXG5cbnB1Ymxpc2hDb21wb3NpdGUoJ3RyYW5zYWN0aW9ucy5oZWlnaHQnLCBmdW5jdGlvbihoZWlnaHQpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZCh7aGVpZ2h0OmhlaWdodH0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCh0eCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCbG9ja3Njb24uZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHtoZWlnaHQ6dHguaGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtmaWVsZHM6e3RpbWU6MSwgaGVpZ2h0OjF9fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSkiLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5pbXBvcnQgeyBCbG9ja3Njb24gfSBmcm9tICcuLi9ibG9ja3MvYmxvY2tzLmpzJztcblxuZXhwb3J0IGNvbnN0IFRyYW5zYWN0aW9ucyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd0cmFuc2FjdGlvbnMnKTtcblxuVHJhbnNhY3Rpb25zLmhlbHBlcnMoe1xuICAgIGJsb2NrKCl7XG4gICAgICAgIHJldHVybiBCbG9ja3Njb24uZmluZE9uZSh7aGVpZ2h0OnRoaXMuaGVpZ2h0fSk7XG4gICAgfVxufSkiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tIFwibWV0ZW9yL21ldGVvclwiO1xuaW1wb3J0IHsgVHJhbnNhY3Rpb25zIH0gZnJvbSBcIi4uLy4uL3RyYW5zYWN0aW9ucy90cmFuc2FjdGlvbnMuanNcIjtcbmltcG9ydCB7IEJsb2Nrc2NvbiB9IGZyb20gXCIuLi8uLi9ibG9ja3MvYmxvY2tzLmpzXCI7XG5pbXBvcnQgeyBEZWxlZ2F0aW9ucyB9IGZyb20gXCIuLi8uLi9kZWxlZ2F0aW9ucy9kZWxlZ2F0aW9ucy5qc1wiO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gXCIuLi92YWxpZGF0b3JzLmpzXCI7XG5pbXBvcnQgeyBNaXNzZWRCbG9ja3MgfSBmcm9tIFwiLi4vLi4vcmVjb3Jkcy9yZWNvcmRzLmpzXCI7XG5pbXBvcnQgeyBDaGFpblN0YXRlcyB9IGZyb20gXCIuLi8uLi9jaGFpbi9jaGFpbi5qc1wiO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSBcIi4uLy4uL3ZvdGluZy1wb3dlci9oaXN0b3J5LmpzXCI7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgXCJWYWxpZGF0b3JzLmZpbmRDcmVhdGVWYWxpZGF0b3JUaW1lXCI6IGZ1bmN0aW9uKGFkZHJlc3MpIHtcbiAgICAvLyBsb29rIHVwIHRoZSBjcmVhdGUgdmFsaWRhdG9yIHRpbWUgdG8gY29uc2lkZXIgaWYgdGhlIHZhbGlkYXRvciBoYXMgbmV2ZXIgdXBkYXRlZCB0aGUgY29tbWlzc2lvblxuICAgIGxldCB0eCA9IFRyYW5zYWN0aW9ucy5maW5kT25lKHtcbiAgICAgICRhbmQ6IFtcbiAgICAgICAgeyBcInR4LnZhbHVlLm1zZy52YWx1ZS5kZWxlZ2F0b3JfYWRkcmVzc1wiOiBhZGRyZXNzIH0sXG4gICAgICAgIHsgXCJ0eC52YWx1ZS5tc2cudHlwZVwiOiBcImNvc21vcy1zZGsvTXNnQ3JlYXRlVmFsaWRhdG9yXCIgfSxcbiAgICAgICAgeyBjb2RlOiB7ICRleGlzdHM6IGZhbHNlIH0gfVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgaWYgKHR4KSB7XG4gICAgICBsZXQgYmxvY2sgPSBCbG9ja3Njb24uZmluZE9uZSh7IGhlaWdodDogdHguaGVpZ2h0IH0pO1xuICAgICAgaWYgKGJsb2NrKSB7XG4gICAgICAgIHJldHVybiBibG9jay50aW1lO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBubyBzdWNoIGNyZWF0ZSB2YWxpZGF0b3IgdHhcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG4gIC8vIGFzeW5jICdWYWxpZGF0b3JzLmdldEFsbERlbGVnYXRpb25zJyhhZGRyZXNzKXtcbiAgXCJWYWxpZGF0b3JzLmdldEFsbERlbGVnYXRpb25zXCIoYWRkcmVzcykge1xuICAgIGxldCB1cmwgPSBMQ0QgKyBcIi9zdGFraW5nL3ZhbGlkYXRvcnMvXCIgKyBhZGRyZXNzICsgXCIvZGVsZWdhdGlvbnNcIjtcblxuICAgIHRyeSB7XG4gICAgICBsZXQgZGVsZWdhdGlvbnMgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgaWYgKGRlbGVnYXRpb25zLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgIGRlbGVnYXRpb25zID1cbiAgICAgICAgICB0eXBlb2YgZGVsZWdhdGlvbnMuZGF0YSAhPSBcInVuZGVmaW5lZFwiXG4gICAgICAgICAgICA/IGRlbGVnYXRpb25zLmRhdGFcbiAgICAgICAgICAgIDogSlNPTi5wYXJzZShkZWxlZ2F0aW9ucy5jb250ZW50KTtcbiAgICAgICAgZGVsZWdhdGlvbnMgPVxuICAgICAgICAgIHR5cGVvZiBkZWxlZ2F0aW9ucyA9PSBcIm9iamVjdFwiICYmXG4gICAgICAgICAgZGVsZWdhdGlvbnMgIT0gbnVsbCAmJlxuICAgICAgICAgIGRlbGVnYXRpb25zLnJlc3VsdCAhPSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gZGVsZWdhdGlvbnMucmVzdWx0XG4gICAgICAgICAgICA6IGRlbGVnYXRpb25zO1xuICAgICAgICBkZWxlZ2F0aW9ucy5mb3JFYWNoKChkZWxlZ2F0aW9uLCBpKSA9PiB7XG4gICAgICAgICAgaWYgKGRlbGVnYXRpb25zW2ldICYmIGRlbGVnYXRpb25zW2ldLnNoYXJlcylcbiAgICAgICAgICAgIGRlbGVnYXRpb25zW2ldLnNoYXJlcyA9IHBhcnNlRmxvYXQoZGVsZWdhdGlvbnNbaV0uc2hhcmVzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGRlbGVnYXRpb25zO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKGUsICdtZXRob2RzLlZhbGlkYXRvcnMuZ2V0QWxsRGVsZWdhdGlvbnMnKTtcbiAgICB9XG4gIH0sXG5cbiAgXCJWYWxpZGF0b3JzLmRldGFpbEJ5QWRkcmVzc1wiOiBmdW5jdGlvbihhZGRyZXNzKSB7XG4gICAgbGV0IGRlbGVnYXRpb25zID0gRGVsZWdhdGlvbnMuZmluZE9uZShcbiAgICAgIHsgZGVsZWdhdGlvbnM6IHsgJGVsZW1NYXRjaDogeyB2YWxpZGF0b3JfYWRkcmVzczogYWRkcmVzcyB9IH0gfSxcbiAgICAgIHsgc29ydDogeyBjcmVhdGVkQXQ6IC0xIH0gfVxuICAgICk7XG4gICAgbGV0IGxhc3RDaGFpblN0YXRzID0gQ2hhaW5TdGF0ZXMuZmluZCh7fSwge3NvcnQ6IHt0aW1lOiAtMX0sIGxpbWl0OiAxfSkuZmV0Y2goKS5tYXAodiA9PiB2LmJvbmRlZFRva2VucyApO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShWYWxpZGF0b3JzLmZpbmQoeyBvcGVyYXRvcl9wdWJrZXk6IGFkZHJlc3MgfSlcbiAgICAgIC5mZXRjaCgpXG4gICAgICAubWFwKHYgPT4ge1xuICAgICAgICB2LmRlbGVnYXRvcnMgPSBkZWxlZ2F0aW9ucyA/IGRlbGVnYXRpb25zLmRlbGVnYXRpb25zIDogW107XG4gICAgICAgIGxldCBtaXNzX2Jsb2NrcyA9IE1pc3NlZEJsb2Nrcy5maW5kKHtwcm9wb3Nlcjogdi5hZGRyZXNzfSwge3NvcnQ6IHtibG9ja0hlaWdodDogLTF9LCBza2lwOiAwLCBsaW1pdDogMTAwfSkuZmV0Y2goKS5tYXAodmFsID0+IHZhbC5ibG9ja0hlaWdodCApO1xuICAgICAgICB2Lm1pc3NfYmxvY2tzID0gbWlzc19ibG9ja3MgPyBtaXNzX2Jsb2NrcyA6IFtdO1xuICAgICAgICBsZXQgcHJvcG9zZWRfYmxvY2tzID0gQmxvY2tzY29uLmZpbmQoe3Byb3Bvc2VyQWRkcmVzczogdi5hZGRyZXNzfSwge3NvcnQ6IHtoZWlnaHQ6IC0xfX0pLmZldGNoKCk7XG4gICAgICAgIHYucHJvcG9zZWRfYmxvY2tzID0gIHByb3Bvc2VkX2Jsb2NrcyA/IHByb3Bvc2VkX2Jsb2NrcyA6IFtdO1xuICAgICAgICB2LmJvbmRlZFRva2VucyA9IGxhc3RDaGFpblN0YXRzID8gbGFzdENoYWluU3RhdHNbMF0gOiAwO1xuICAgICAgICBsZXQgcG93ZXJfZXZlbnRzID0gVm90aW5nUG93ZXJIaXN0b3J5LmZpbmQoe2FkZHJlc3M6IHYuYWRkcmVzc30sIHtzb3J0OiB7YmxvY2tfdGltZTogLTF9fSkuZmV0Y2goKS5tYXAodmFsID0+IHtcbiAgICAgICAgICAgIHZhbC5ibG9jayA9IEJsb2Nrc2Nvbi5maW5kT25lKHtoZWlnaHQ6IHZhbC5oZWlnaHR9KTtcbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH0pO1xuICAgICAgICB2LnBvd2VyX2hpc3RvcnkgPSBwb3dlcl9ldmVudHMgPyBwb3dlcl9ldmVudHMgOiBbXTtcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgICB9KSk7XG4gIH0sXG4gIFwiVmFsaWRhdG9ycy5wYWdpbmF0aW9uXCI6IGZ1bmN0aW9uKGphaWxlZF92YWx1ZSwgcGFnZSwgbGltaXQpIHtcbiAgICBsZXQgcmVzcG9uc2UgPSBWYWxpZGF0b3JzLmZpbmQoXG4gICAgICB7XG4gICAgICAgIGphaWxlZDogeyAkZXhpc3RzOiB0cnVlLCAkZXE6IGphaWxlZF92YWx1ZSB9LFxuICAgICAgICB2b3RpbmdfcG93ZXI6IHsgJGV4aXN0czogdHJ1ZSwgJGd0OiAwIH1cbiAgICAgIH0sXG4gICAgICB7IHNvcnQ6IHsgdm90aW5nX3Bvd2VyOiAtMSB9LCBza2lwOiAwLCBsaW1pdDogbGltaXQgfVxuICAgICkuZmV0Y2goKTtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpO1xuICB9LFxuICBcIlZhbGlkYXRvcnMuY291bnRcIjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRvdGFsX3ZhbGlkYXRvcl9udW06IFZhbGlkYXRvcnMuZmluZCgpLmNvdW50KCksXG4gICAgICB1bmphaWxlZF92YWxpZGF0b3JfbnVtOiBWYWxpZGF0b3JzLmZpbmQoeyBqYWlsZWQ6IGZhbHNlIH0pLmNvdW50KClcbiAgICB9O1xuICB9XG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uL3ZhbGlkYXRvcnMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9yUmVjb3JkcyB9IGZyb20gJy4uLy4uL3JlY29yZHMvcmVjb3Jkcy5qcyc7XG5pbXBvcnQgeyBWb3RpbmdQb3dlckhpc3RvcnkgfSBmcm9tICcuLi8uLi92b3RpbmctcG93ZXIvaGlzdG9yeS5qcyc7XG5cbk1ldGVvci5wdWJsaXNoKCd2YWxpZGF0b3JzLmFsbCcsIGZ1bmN0aW9uIChzb3J0ID0gXCJkZXNjcmlwdGlvbi5tb25pa2VyXCIsIGRpcmVjdGlvbiA9IC0xLCBmaWVsZHM9e30pIHtcbiAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKHt9LCB7c29ydDoge1tzb3J0XTogZGlyZWN0aW9ufSwgZmllbGRzOiBmaWVsZHN9KTtcbn0pO1xuXG5wdWJsaXNoQ29tcG9zaXRlKCd2YWxpZGF0b3JzLmZpcnN0U2Vlbicse1xuICAgIGZpbmQoKSB7XG4gICAgICAgIHJldHVybiBWYWxpZGF0b3JzLmZpbmQoe30pO1xuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgICAgZmluZCh2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKFxuICAgICAgICAgICAgICAgICAgICB7IGFkZHJlc3M6IHZhbC5hZGRyZXNzIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgc29ydDoge2hlaWdodDogMX0sIGxpbWl0OiAxfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBdXG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ3ZhbGlkYXRvcnMudm90aW5nX3Bvd2VyJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBqYWlsZWQ6ZmFsc2VcbiAgICB9LHtcbiAgICAgICAgc29ydDp7XG4gICAgICAgICAgICB2b3RpbmdfcG93ZXI6LTFcbiAgICAgICAgfSxcbiAgICAgICAgZmllbGRzOntcbiAgICAgICAgICAgIGFkZHJlc3M6IDEsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoxLFxuICAgICAgICAgICAgdm90aW5nX3Bvd2VyOjEsXG4gICAgICAgICAgICBwcm9maWxlX3VybDoxXG4gICAgICAgIH1cbiAgICB9XG4gICAgKTtcbn0pO1xuXG5wdWJsaXNoQ29tcG9zaXRlKCd2YWxpZGF0b3IuZGV0YWlscycsIGZ1bmN0aW9uKGFkZHJlc3Mpe1xuICAgIGxldCBvcHRpb25zID0ge2FkZHJlc3M6YWRkcmVzc307XG4gICAgaWYgKGFkZHJlc3MuaW5kZXhPZihNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeFZhbEFkZHIpICE9IC0xKXtcbiAgICAgICAgb3B0aW9ucyA9IHtvcGVyYXRvcl9hZGRyZXNzOmFkZHJlc3N9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBWYWxpZGF0b3JzLmZpbmQob3B0aW9ucylcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKHZhbCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWb3RpbmdQb3dlckhpc3RvcnkuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHthZGRyZXNzOnZhbC5hZGRyZXNzfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtzb3J0OntoZWlnaHQ6LTF9LCBsaW1pdDo1MH1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZhbGlkYXRvclJlY29yZHMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgYWRkcmVzczogdmFsLmFkZHJlc3MgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc29ydDoge2hlaWdodDogLTF9LCBsaW1pdDogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy51cHRpbWVXaW5kb3d9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSk7XG5cbk1ldGVvci5wdWJsaXNoKCd2YWxpZGF0b3JzLmNvdW50JywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKCk7XG59KTtcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMgfSBmcm9tICcuLi9yZWNvcmRzL3JlY29yZHMuanMnO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSAnLi4vdm90aW5nLXBvd2VyL2hpc3RvcnkuanMnO1xuXG5leHBvcnQgY29uc3QgVmFsaWRhdG9ycyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2YWxpZGF0b3JzJyk7XG5cblZhbGlkYXRvcnMuaGVscGVycyh7XG4gICAgZmlyc3RTZWVuKCl7XG4gICAgICAgIHJldHVybiBWYWxpZGF0b3JSZWNvcmRzLmZpbmRPbmUoe2FkZHJlc3M6dGhpcy5hZGRyZXNzfSk7XG4gICAgfSxcbiAgICBoaXN0b3J5KCl7XG4gICAgICAgIHJldHVybiBWb3RpbmdQb3dlckhpc3RvcnkuZmluZCh7YWRkcmVzczp0aGlzLmFkZHJlc3N9LCB7c29ydDp7aGVpZ2h0Oi0xfSwgbGltaXQ6NTB9KS5mZXRjaCgpO1xuICAgIH1cbn0pXG4vLyBWYWxpZGF0b3JzLmhlbHBlcnMoe1xuLy8gICAgIHVwdGltZSgpe1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmFkZHJlc3MpO1xuLy8gICAgICAgICBsZXQgbGFzdEh1bmRyZWQgPSBWYWxpZGF0b3JSZWNvcmRzLmZpbmQoe2FkZHJlc3M6dGhpcy5hZGRyZXNzfSwge3NvcnQ6e2hlaWdodDotMX0sIGxpbWl0OjEwMH0pLmZldGNoKCk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKGxhc3RIdW5kcmVkKTtcbi8vICAgICAgICAgbGV0IHVwdGltZSA9IDA7XG4vLyAgICAgICAgIGZvciAoaSBpbiBsYXN0SHVuZHJlZCl7XG4vLyAgICAgICAgICAgICBpZiAobGFzdEh1bmRyZWRbaV0uZXhpc3RzKXtcbi8vICAgICAgICAgICAgICAgICB1cHRpbWUrPTE7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgIH1cbi8vICAgICAgICAgcmV0dXJuIHVwdGltZTtcbi8vICAgICB9XG4vLyB9KSIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IFZvdGluZ1Bvd2VySGlzdG9yeSA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2b3RpbmdfcG93ZXJfaGlzdG9yeScpO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuXG5leHBvcnQgY29uc3QgRXZpZGVuY2VzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2V2aWRlbmNlcycpO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuXG5leHBvcnQgY29uc3QgVmFsaWRhdG9yU2V0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2YWxpZGF0b3Jfc2V0cycpO1xuIiwiaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnLi4vLi4vYXBpL2Jsb2Nrcy9ibG9ja3MuanMnO1xuaW1wb3J0IHsgUHJvcG9zYWxzIH0gZnJvbSAnLi4vLi4vYXBpL3Byb3Bvc2Fscy9wcm9wb3NhbHMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9yUmVjb3JkcywgQW5hbHl0aWNzLCBNaXNzZWRCbG9ja3NTdGF0cywgTWlzc2VkQmxvY2tzLCBBdmVyYWdlRGF0YSwgQXZlcmFnZVZhbGlkYXRvckRhdGEgfSBmcm9tICcuLi8uLi9hcGkvcmVjb3Jkcy9yZWNvcmRzLmpzJztcbi8vIGltcG9ydCB7IFN0YXR1cyB9IGZyb20gJy4uLy4uL2FwaS9zdGF0dXMvc3RhdHVzLmpzJztcbmltcG9ydCB7IFRyYW5zYWN0aW9ucyB9IGZyb20gJy4uLy4uL2FwaS90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvclNldHMgfSBmcm9tICcuLi8uLi9hcGkvdmFsaWRhdG9yLXNldHMvdmFsaWRhdG9yLXNldHMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uLy4uL2FwaS92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSAnLi4vLi4vYXBpL3ZvdGluZy1wb3dlci9oaXN0b3J5LmpzJztcbmltcG9ydCB7IEV2aWRlbmNlcyB9IGZyb20gJy4uLy4uL2FwaS9ldmlkZW5jZXMvZXZpZGVuY2VzLmpzJztcbmltcG9ydCB7IENvaW5TdGF0cyB9IGZyb20gJy4uLy4uL2FwaS9jb2luLXN0YXRzL2NvaW4tc3RhdHMuanMnO1xuaW1wb3J0IHsgQ2hhaW5TdGF0ZXMgfSBmcm9tICcuLi8uLi9hcGkvY2hhaW4vY2hhaW4uanMnO1xuXG5DaGFpblN0YXRlcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2hlaWdodDogLTF9LHt1bmlxdWU6dHJ1ZX0pO1xuXG5CbG9ja3Njb24ucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtoZWlnaHQ6IC0xfSx7dW5pcXVlOnRydWV9KTtcbkJsb2Nrc2Nvbi5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb3Bvc2VyQWRkcmVzczoxfSk7XG5cbkV2aWRlbmNlcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2hlaWdodDogLTF9KTtcblxuUHJvcG9zYWxzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7cHJvcG9zYWxJZDogMX0sIHt1bmlxdWU6dHJ1ZX0pO1xuXG5WYWxpZGF0b3JSZWNvcmRzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7YWRkcmVzczoxLGhlaWdodDogLTF9LCB7dW5pcXVlOjF9KTtcblZhbGlkYXRvclJlY29yZHMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHthZGRyZXNzOjEsZXhpc3RzOjEsIGhlaWdodDogLTF9KTtcblxuQW5hbHl0aWNzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7aGVpZ2h0OiAtMX0sIHt1bmlxdWU6dHJ1ZX0pXG5cbk1pc3NlZEJsb2Nrcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb3Bvc2VyOjEsIHZvdGVyOjEsIHVwZGF0ZWRBdDogLTF9KTtcbk1pc3NlZEJsb2Nrcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb3Bvc2VyOjEsIGJsb2NrSGVpZ2h0Oi0xfSk7XG5NaXNzZWRCbG9ja3MucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHt2b3RlcjoxLCBibG9ja0hlaWdodDotMX0pO1xuTWlzc2VkQmxvY2tzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7dm90ZXI6MSwgcHJvcG9zZXI6MSwgYmxvY2tIZWlnaHQ6LTF9LCB7dW5pcXVlOnRydWV9KTtcblxuTWlzc2VkQmxvY2tzU3RhdHMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtwcm9wb3NlcjoxfSk7XG5NaXNzZWRCbG9ja3NTdGF0cy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3ZvdGVyOjF9KTtcbk1pc3NlZEJsb2Nrc1N0YXRzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7cHJvcG9zZXI6MSwgdm90ZXI6MX0se3VuaXF1ZTp0cnVlfSk7XG5cbkF2ZXJhZ2VEYXRhLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7dHlwZToxLCBjcmVhdGVkQXQ6LTF9LHt1bmlxdWU6dHJ1ZX0pO1xuQXZlcmFnZVZhbGlkYXRvckRhdGEucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtwcm9wb3NlckFkZHJlc3M6MSxjcmVhdGVkQXQ6LTF9LHt1bmlxdWU6dHJ1ZX0pO1xuLy8gU3RhdHVzLnJhd0NvbGxlY3Rpb24uY3JlYXRlSW5kZXgoe30pXG5cblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3R4aGFzaDoxfSx7dW5pcXVlOnRydWV9KTtcblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2hlaWdodDotMX0pO1xuLy8gVHJhbnNhY3Rpb25zLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7YWN0aW9uOjF9KTtcblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe1wiZXZlbnRzLmF0dHJpYnV0ZXMua2V5XCI6MX0pO1xuVHJhbnNhY3Rpb25zLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7XCJldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOjF9KTtcblxuVmFsaWRhdG9yU2V0cy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2Jsb2NrX2hlaWdodDotMX0pO1xuXG5WYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7YWRkcmVzczoxfSx7dW5pcXVlOnRydWUsIHBhcnRpYWxGaWx0ZXJFeHByZXNzaW9uOiB7IGFkZHJlc3M6IHsgJGV4aXN0czogdHJ1ZSB9IH0gfSk7XG5WYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7Y29uc2Vuc3VzX3B1YmtleToxfSx7dW5pcXVlOnRydWV9KTtcblZhbGlkYXRvcnMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtcInB1Yl9rZXkudmFsdWVcIjoxfSx7dW5pcXVlOnRydWUsIHBhcnRpYWxGaWx0ZXJFeHByZXNzaW9uOiB7IFwicHViX2tleS52YWx1ZVwiOiB7ICRleGlzdHM6IHRydWUgfSB9fSk7XG5cblZvdGluZ1Bvd2VySGlzdG9yeS5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2FkZHJlc3M6MSxoZWlnaHQ6LTF9KTtcblZvdGluZ1Bvd2VySGlzdG9yeS5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3R5cGU6MX0pO1xuXG5Db2luU3RhdHMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtsYXN0X3VwZGF0ZWRfYXQ6LTF9LHt1bmlxdWU6dHJ1ZX0pO1xuIiwiLy8gSW1wb3J0IHNlcnZlciBzdGFydHVwIHRocm91Z2ggYSBzaW5nbGUgaW5kZXggZW50cnkgcG9pbnRcblxuaW1wb3J0ICcuL3V0aWwuanMnO1xuaW1wb3J0ICcuL3JlZ2lzdGVyLWFwaS5qcyc7XG5pbXBvcnQgJy4vY3JlYXRlLWluZGV4ZXMuanMnO1xuXG4vLyBpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuLy8gaW1wb3J0IHsgcmVuZGVyVG9Ob2RlU3RyZWFtIH0gZnJvbSAncmVhY3QtZG9tL3NlcnZlcic7XG4vLyBpbXBvcnQgeyByZW5kZXJUb1N0cmluZyB9IGZyb20gXCJyZWFjdC1kb20vc2VydmVyXCI7XG4vLyBpbXBvcnQgeyBvblBhZ2VMb2FkIH0gZnJvbSAnbWV0ZW9yL3NlcnZlci1yZW5kZXInO1xuLy8gaW1wb3J0IHsgU3RhdGljUm91dGVyIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG4vLyBpbXBvcnQgeyBTZXJ2ZXJTdHlsZVNoZWV0IH0gZnJvbSBcInN0eWxlZC1jb21wb25lbnRzXCJcbi8vIGltcG9ydCB7IEhlbG1ldCB9IGZyb20gJ3JlYWN0LWhlbG1ldCc7XG5cbi8vIGltcG9ydCBBcHAgZnJvbSAnLi4vLi4vdWkvQXBwLmpzeCc7XG5cbi8vIG9uUGFnZUxvYWQoc2luayA9PiB7XG4gICAgLy8gY29uc3QgY29udGV4dCA9IHt9O1xuICAgIC8vIGNvbnN0IHNoZWV0ID0gbmV3IFNlcnZlclN0eWxlU2hlZXQoKVxuXG4gICAgLy8gY29uc3QgaHRtbCA9IHJlbmRlclRvU3RyaW5nKHNoZWV0LmNvbGxlY3RTdHlsZXMoXG4gICAgLy8gICAgIDxTdGF0aWNSb3V0ZXIgbG9jYXRpb249e3NpbmsucmVxdWVzdC51cmx9IGNvbnRleHQ9e2NvbnRleHR9PlxuICAgIC8vICAgICAgICAgPEFwcCAvPlxuICAgIC8vICAgICA8L1N0YXRpY1JvdXRlcj5cbiAgICAvLyAgICkpO1xuXG4gICAgLy8gc2luay5yZW5kZXJJbnRvRWxlbWVudEJ5SWQoJ2FwcCcsIGh0bWwpO1xuXG4gICAgLy8gY29uc3QgaGVsbWV0ID0gSGVsbWV0LnJlbmRlclN0YXRpYygpO1xuICAgIC8vIHNpbmsuYXBwZW5kVG9IZWFkKGhlbG1ldC5tZXRhLnRvU3RyaW5nKCkpO1xuICAgIC8vIHNpbmsuYXBwZW5kVG9IZWFkKGhlbG1ldC50aXRsZS50b1N0cmluZygpKTtcblxuICAgIC8vIHNpbmsuYXBwZW5kVG9IZWFkKHNoZWV0LmdldFN0eWxlVGFncygpKTtcbi8vIH0pOyIsIi8vIFJlZ2lzdGVyIHlvdXIgYXBpcyBoZXJlXG5cbmltcG9ydCAnLi4vLi4vYXBpL2xlZGdlci9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL2NoYWluL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL2NoYWluL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9ibG9ja3Mvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvYmxvY2tzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS92YWxpZGF0b3JzL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL3ZhbGlkYXRvcnMvc2VydmVyL3B1YmxpY2F0aW9ucy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL3JlY29yZHMvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvcmVjb3Jkcy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvcHJvcG9zYWxzL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL3Byb3Bvc2Fscy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvdm90aW5nLXBvd2VyL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS90cmFuc2FjdGlvbnMvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvdHJhbnNhY3Rpb25zL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5pbXBvcnQgJy4uLy4uL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvc3RhdHVzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9hY2NvdW50cy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL2NvaW4tc3RhdHMvc2VydmVyL21ldGhvZHMuanMnO1xuIiwiaW1wb3J0IGJlY2gzMiBmcm9tICdiZWNoMzInXG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcblxuLy8gTG9hZCBmdXR1cmUgZnJvbSBmaWJlcnNcbnZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZShcImZpYmVycy9mdXR1cmVcIik7XG4vLyBMb2FkIGV4ZWNcbnZhciBleGVjID0gTnBtLnJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpLmV4ZWM7XG5cbmZ1bmN0aW9uIHRvSGV4U3RyaW5nKGJ5dGVBcnJheSkge1xuICAgIHJldHVybiBieXRlQXJyYXkubWFwKGZ1bmN0aW9uKGJ5dGUpIHtcbiAgICAgICAgcmV0dXJuICgnMCcgKyAoYnl0ZSAmIDB4RkYpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpO1xuICAgIH0pLmpvaW4oJycpXG59XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgICBwdWJrZXlUb0JlY2gzMjogZnVuY3Rpb24ocHVia2V5LCBwcmVmaXgpIHtcbiAgICAgICAgLy8gJzE2MjRERTY0MjAnIGlzIGVkMjU1MTkgcHVia2V5IHByZWZpeFxuICAgICAgICBsZXQgcHVia2V5QW1pbm9QcmVmaXggPSBCdWZmZXIuZnJvbSgnMTYyNERFNjQyMCcsICdoZXgnKVxuICAgICAgICBsZXQgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDM3KVxuICAgICAgICBwdWJrZXlBbWlub1ByZWZpeC5jb3B5KGJ1ZmZlciwgMClcbiAgICAgICAgQnVmZmVyLmZyb20ocHVia2V5LnZhbHVlLCAnYmFzZTY0JykuY29weShidWZmZXIsIHB1YmtleUFtaW5vUHJlZml4Lmxlbmd0aClcbiAgICAgICAgcmV0dXJuIGJlY2gzMi5lbmNvZGUocHJlZml4LCBiZWNoMzIudG9Xb3JkcyhidWZmZXIpKVxuICAgIH0sXG4gICAgYmVjaDMyVG9QdWJrZXk6IGZ1bmN0aW9uKHB1YmtleSkge1xuICAgICAgICAvLyAnMTYyNERFNjQyMCcgaXMgZWQyNTUxOSBwdWJrZXkgcHJlZml4XG4gICAgICAgIGxldCBwdWJrZXlBbWlub1ByZWZpeCA9IEJ1ZmZlci5mcm9tKCcxNjI0REU2NDIwJywgJ2hleCcpXG4gICAgICAgIGxldCBidWZmZXIgPSBCdWZmZXIuZnJvbShiZWNoMzIuZnJvbVdvcmRzKGJlY2gzMi5kZWNvZGUocHVia2V5KS53b3JkcykpO1xuICAgICAgICByZXR1cm4gYnVmZmVyLnNsaWNlKHB1YmtleUFtaW5vUHJlZml4Lmxlbmd0aCkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgIH0sXG4gICAgZ2V0RGVsZWdhdG9yOiBmdW5jdGlvbihvcGVyYXRvckFkZHIpe1xuICAgICAgICBsZXQgYWRkcmVzcyA9IGJlY2gzMi5kZWNvZGUob3BlcmF0b3JBZGRyKTtcbiAgICAgICAgcmV0dXJuIGJlY2gzMi5lbmNvZGUoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhBY2NBZGRyLCBhZGRyZXNzLndvcmRzKTtcbiAgICB9LFxuICAgIGdldEtleWJhc2VUZWFtUGljOiBmdW5jdGlvbihrZXliYXNlVXJsKXtcbiAgICAgICAgbGV0IHRlYW1QYWdlID0gSFRUUC5nZXQoa2V5YmFzZVVybCk7XG4gICAgICAgIGlmICh0ZWFtUGFnZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICBsZXQgcGFnZSA9IGNoZWVyaW8ubG9hZCh0ZWFtUGFnZS5jb250ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBwYWdlKFwiLmtiLW1haW4tY2FyZCBpbWdcIikuYXR0cignc3JjJyk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiLy8gU2VydmVyIGVudHJ5IHBvaW50LCBpbXBvcnRzIGFsbCBzZXJ2ZXIgY29kZVxuXG5pbXBvcnQgJy9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyJztcbi8vIGltcG9ydCAnL2ltcG9ydHMvc3RhcnR1cC9ib3RoJztcbi8vIGltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50Jztcbi8vIGltcG9ydCAnL2ltcG9ydHMvYXBpL2Jsb2Nrcy9ibG9ja3MuanMnO1xuXG5TWU5DSU5HID0gZmFsc2U7XG5DT1VOVE1JU1NFREJMT0NLUyA9IGZhbHNlO1xuQ09VTlRNSVNTRURCTE9DS1NTVEFUUyA9IGZhbHNlO1xuUlBDID0gTWV0ZW9yLnNldHRpbmdzLnJlbW90ZS5ycGM7XG5MQ0QgPSBNZXRlb3Iuc2V0dGluZ3MucmVtb3RlLmxjZDtcbnRpbWVyQmxvY2tzID0gMDtcbnRpbWVyQ2hhaW4gPSAwO1xudGltZXJDb25zZW5zdXMgPSAwO1xudGltZXJQcm9wb3NhbCA9IDA7XG50aW1lclByb3Bvc2Fsc1Jlc3VsdHMgPSAwO1xudGltZXJNaXNzZWRCbG9jayA9IDA7XG50aW1lckRlbGVnYXRpb24gPSAwO1xudGltZXJBZ2dyZWdhdGUgPSAwO1xuXG5jb25zdCBERUZBVUxUU0VUVElOR1MgPSAnL2RlZmF1bHRfc2V0dGluZ3MuanNvbic7XG5cbnVwZGF0ZUNoYWluU3RhdHVzID0gKCkgPT4ge1xuICAgIE1ldGVvci5jYWxsKCdjaGFpbi51cGRhdGVTdGF0dXMnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVTdGF0dXM6IFwiK2Vycm9yLCAnc2VydmVyLWNoYWluLnVwZGF0ZVN0YXR1cycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZVN0YXR1czogXCIrcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnVwZGF0ZUJsb2NrID0gKCkgPT4ge1xuICAgIE1ldGVvci5jYWxsKCdibG9ja3MuYmxvY2tzVXBkYXRlJywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlQmxvY2tzOiBcIitlcnJvciwgJ3NlcnZlci1ibG9ja3MuYmxvY2tzVXBkYXRlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlQmxvY2tzOiBcIityZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxuZ2V0Q29uc2Vuc3VzU3RhdGUgPSAoKSA9PiB7XG4gICAgTWV0ZW9yLmNhbGwoJ2NoYWluLmdldENvbnNlbnN1c1N0YXRlJywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2V0IGNvbnNlbnN1czogXCIrZXJyb3IsICdzZXJ2ZXItY2hhaW4uZ2V0Q29uc2Vuc3VzU3RhdGUnKVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuZ2V0UHJvcG9zYWxzID0gKCkgPT4ge1xuICAgIE1ldGVvci5jYWxsKCdwcm9wb3NhbHMuZ2V0UHJvcG9zYWxzJywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2V0IHByb3Bvc2FsOiBcIisgZXJyb3IsICdzZXJ2ZXItcHJvcG9zYWxzLmdldFByb3Bvc2FscycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgcHJvcG9zYWw6IFwiK3Jlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZ2V0UHJvcG9zYWxzUmVzdWx0cyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgncHJvcG9zYWxzLmdldFByb3Bvc2FsUmVzdWx0cycsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBwcm9wb3NhbHMgcmVzdWx0OiBcIitlcnJvciwgJ3NlcnZlci1wcm9wb3NhbHMuZ2V0UHJvcG9zYWxSZXN1bHRzJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBwcm9wb3NhbHMgcmVzdWx0OiBcIityZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbnVwZGF0ZU1pc3NlZEJsb2NrcyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnVmFsaWRhdG9yUmVjb3Jkcy5jYWxjdWxhdGVNaXNzZWRCbG9ja3MnLCAoZXJyb3IsIHJlc3VsdCkgPT57XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pc3NlZCBibG9ja3MgZXJyb3I6IFwiKyBlcnJvciwgJ3NlcnZlci1WYWxpZGF0b3JSZWNvcmRzLmNhbGN1bGF0ZU1pc3NlZEJsb2NrcycpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pc3NlZCBibG9ja3Mgb2s6XCIgKyByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSk7XG4vKlxuICAgIE1ldGVvci5jYWxsKCdWYWxpZGF0b3JSZWNvcmRzLmNhbGN1bGF0ZU1pc3NlZEJsb2Nrc1N0YXRzJywgKGVycm9yLCByZXN1bHQpID0+e1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtaXNzZWQgYmxvY2tzIHN0YXRzIGVycm9yOiBcIisgZXJyb3IpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pc3NlZCBibG9ja3Mgc3RhdHMgb2s6XCIgKyByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSk7XG4qL1xufVxuXG5nZXREZWxlZ2F0aW9ucyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnZGVsZWdhdGlvbnMuZ2V0RGVsZWdhdGlvbnMnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgZGVsZWdhdGlvbnMgZXJyb3I6IFwiKyBlcnJvciwgJ3NlcnZlci1kZWxlZ2F0aW9ucy5nZXREZWxlZ2F0aW9ucycpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2V0IGRlbGVnYXRpb25zIG9rOiBcIisgcmVzdWx0KVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmFnZ3JlZ2F0ZU1pbnV0ZWx5ID0gKCkgPT57XG4gICAgLy8gZG9pbmcgc29tZXRoaW5nIGV2ZXJ5IG1pblxuICAgIE1ldGVvci5jYWxsKCdBbmFseXRpY3MuYWdncmVnYXRlQmxvY2tUaW1lQW5kVm90aW5nUG93ZXInLCBcIm1cIiwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIG1pbnV0ZWx5IGJsb2NrIHRpbWUgZXJyb3I6IFwiK2Vycm9yLCAnc2VydmVyLUFuYWx5dGljcy5hZ2dyZWdhdGVCbG9ja1RpbWVBbmRWb3RpbmdQb3dlcicpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIG1pbnV0ZWx5IGJsb2NrIHRpbWUgb2s6IFwiK3Jlc3VsdClcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWV0ZW9yLmNhbGwoJ2NvaW5TdGF0cy5nZXRDb2luU3RhdHMnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgY29pbiBzdGF0cyBlcnJvcjogXCIrZXJyb3IsICdzZXJ2ZXItY29pblN0YXRzLmdldENvaW5TdGF0cycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBjb2luIHN0YXRzIG9rOiBcIityZXN1bHQpXG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuYWdncmVnYXRlSG91cmx5ID0gKCkgPT57XG4gICAgLy8gZG9pbmcgc29tZXRoaW5nIGV2ZXJ5IGhvdXJcbiAgICBNZXRlb3IuY2FsbCgnQW5hbHl0aWNzLmFnZ3JlZ2F0ZUJsb2NrVGltZUFuZFZvdGluZ1Bvd2VyJywgXCJoXCIsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSBob3VybHkgYmxvY2sgdGltZSBlcnJvcjogXCIrZXJyb3IsICdzZXJ2ZXItQW5hbHl0aWNzLmFnZ3JlZ2F0ZUJsb2NrVGltZUFuZFZvdGluZ1Bvd2VyJylcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZ2dyZWdhdGUgaG91cmx5IGJsb2NrIHRpbWUgb2s6IFwiK3Jlc3VsdClcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5hZ2dyZWdhdGVEYWlseSA9ICgpID0+e1xuICAgIC8vIGRvaW5nIHNvbXRoaW5nIGV2ZXJ5IGRheVxuICAgIE1ldGVvci5jYWxsKCdBbmFseXRpY3MuYWdncmVnYXRlQmxvY2tUaW1lQW5kVm90aW5nUG93ZXInLCBcImRcIiwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIGRhaWx5IGJsb2NrIHRpbWUgZXJyb3I6IFwiK2Vycm9yLCAnc2VydmVyLUFuYWx5dGljcy5hZ2dyZWdhdGVCbG9ja1RpbWVBbmRWb3RpbmdQb3dlcicpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIGRhaWx5IGJsb2NrIHRpbWUgb2s6IFwiK3Jlc3VsdClcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWV0ZW9yLmNhbGwoJ0FuYWx5dGljcy5hZ2dyZWdhdGVWYWxpZGF0b3JEYWlseUJsb2NrVGltZScsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSB2YWxpZGF0b3JzIGJsb2NrIHRpbWUgZXJyb3I6XCIrIGVycm9yLCAnc2VydmVyLUFuYWx5dGljcy5hZ2dyZWdhdGVWYWxpZGF0b3JEYWlseUJsb2NrVGltZScpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSB2YWxpZGF0b3JzIGJsb2NrIHRpbWUgb2s6XCIrIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKXtcbiAgICBpZiAoTWV0ZW9yLmlzRGV2ZWxvcG1lbnQpe1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX1RMU19SRUpFQ1RfVU5BVVRIT1JJWkVEID0gMDtcbiAgICAgICAgaW1wb3J0IERFRkFVTFRTRVRUSU5HU0pTT04gZnJvbSAnLi4vZGVmYXVsdF9zZXR0aW5ncy5qc29uJ1xuICAgICAgICBPYmplY3Qua2V5cyhERUZBVUxUU0VUVElOR1NKU09OKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgIGlmIChNZXRlb3Iuc2V0dGluZ3Nba2V5XSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYENIRUNLIFNFVFRJTkdTIEpTT046ICR7a2V5fSBpcyBtaXNzaW5nIGZyb20gc2V0dGluZ3NgKVxuICAgICAgICAgICAgICAgIE1ldGVvci5zZXR0aW5nc1trZXldID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhERUZBVUxUU0VUVElOR1NKU09OW2tleV0pLmZvckVhY2goKHBhcmFtKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKE1ldGVvci5zZXR0aW5nc1trZXldW3BhcmFtXSA9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYENIRUNLIFNFVFRJTkdTIEpTT046ICR7a2V5fS4ke3BhcmFtfSBpcyBtaXNzaW5nIGZyb20gc2V0dGluZ3NgKVxuICAgICAgICAgICAgICAgICAgICBNZXRlb3Iuc2V0dGluZ3Nba2V5XVtwYXJhbV0gPSBERUZBVUxUU0VUVElOR1NKU09OW2tleV1bcGFyYW1dXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBNZXRlb3IuY2FsbCgnY2hhaW4uZ2VuZXNpcycsIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICBpZiAoTWV0ZW9yLnNldHRpbmdzLmRlYnVnLnN0YXJ0VGltZXIpe1xuICAgICAgICAgICAgICAgIHRpbWVyQ29uc2Vuc3VzID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGdldENvbnNlbnN1c1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5jb25zZW5zdXNJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgICAgICB0aW1lckJsb2NrcyA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVCbG9jaygpO1xuICAgICAgICAgICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMuYmxvY2tJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgICAgICB0aW1lckNoYWluID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNoYWluU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5zdGF0dXNJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgICAgICB0aW1lclByb3Bvc2FsID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGdldFByb3Bvc2FscygpO1xuICAgICAgICAgICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMucHJvcG9zYWxJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgICAgICB0aW1lclByb3Bvc2Fsc1Jlc3VsdHMgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgZ2V0UHJvcG9zYWxzUmVzdWx0cygpO1xuICAgICAgICAgICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMucHJvcG9zYWxJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgICAgICB0aW1lck1pc3NlZEJsb2NrID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU1pc3NlZEJsb2NrcygpO1xuICAgICAgICAgICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMubWlzc2VkQmxvY2tzSW50ZXJ2YWwpO1xuXG4gICAgICAgICAgICAgICAgdGltZXJEZWxlZ2F0aW9uID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGdldERlbGVnYXRpb25zKCk7XG4gICAgICAgICAgICAgICAgfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5kZWxlZ2F0aW9uSW50ZXJ2YWwpO1xuXG4gICAgICAgICAgICAgICAgdGltZXJBZ2dyZWdhdGUgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobm93LmdldFVUQ1NlY29uZHMoKSA9PSAwKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZ2dyZWdhdGVNaW51dGVseSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKChub3cuZ2V0VVRDTWludXRlcygpID09IDApICYmIChub3cuZ2V0VVRDU2Vjb25kcygpID09IDApKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZUhvdXJseSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKChub3cuZ2V0VVRDSG91cnMoKSA9PSAwKSAmJiAobm93LmdldFVUQ01pbnV0ZXMoKSA9PSAwKSAmJiAobm93LmdldFVUQ1NlY29uZHMoKSA9PSAwKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZ2dyZWdhdGVEYWlseSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG5cbn0pO1xuIl19
