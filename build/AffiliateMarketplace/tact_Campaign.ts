import { 
    Cell,
    Slice, 
    Address, 
    Builder, 
    beginCell, 
    ComputeError, 
    TupleItem, 
    TupleReader, 
    Dictionary, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    Contract, 
    ContractABI, 
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    let sc_0 = slice;
    let _code = sc_0.loadRef();
    let _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadGetterTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function storeTupleStateInit(source: StateInit) {
    let builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    let sc_0 = slice;
    let _workchain = sc_0.loadIntBig(8);
    let _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

function loadTupleStdAddress(source: TupleReader) {
    let _workchain = source.readBigNumber();
    let _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

function loadGetterTupleStdAddress(source: TupleReader) {
    let _workchain = source.readBigNumber();
    let _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

function storeTupleStdAddress(source: StdAddress) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    let sc_0 = slice;
    let _workchain = sc_0.loadIntBig(32);
    let _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

function loadTupleVarAddress(source: TupleReader) {
    let _workchain = source.readBigNumber();
    let _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

function loadGetterTupleVarAddress(source: TupleReader) {
    let _workchain = source.readBigNumber();
    let _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

function storeTupleVarAddress(source: VarAddress) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounced: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounced);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    let sc_0 = slice;
    let _bounced = sc_0.loadBit();
    let _sender = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadGetterTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function storeTupleContext(source: Context) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounced);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    bounce: boolean;
    to: Address;
    value: bigint;
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounce);
        b_0.storeAddress(src.to);
        b_0.storeInt(src.value, 257);
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
    };
}

export function loadSendParameters(slice: Slice) {
    let sc_0 = slice;
    let _bounce = sc_0.loadBit();
    let _to = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _mode = sc_0.loadIntBig(257);
    let _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadGetterTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function storeTupleSendParameters(source: SendParameters) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounce);
    builder.writeAddress(source.to);
    builder.writeNumber(source.value);
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwner = {
    $$type: 'ChangeOwner';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwner(src: ChangeOwner) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2174598809, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwner(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2174598809) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadTupleChangeOwner(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadGetterTupleChangeOwner(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

function storeTupleChangeOwner(source: ChangeOwner) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

function dictValueParserChangeOwner(): DictionaryValue<ChangeOwner> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwner(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwner(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwnerOk = {
    $$type: 'ChangeOwnerOk';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwnerOk(src: ChangeOwnerOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(846932810, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwnerOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 846932810) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadTupleChangeOwnerOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadGetterTupleChangeOwnerOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

function storeTupleChangeOwnerOk(source: ChangeOwnerOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

function dictValueParserChangeOwnerOk(): DictionaryValue<ChangeOwnerOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwnerOk(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwnerOk(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadGetterTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function storeTupleDeploy(source: Deploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadGetterTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function storeTupleDeployOk(source: DeployOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadGetterTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function storeTupleFactoryDeploy(source: FactoryDeploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type AdminWithdraw = {
    $$type: 'AdminWithdraw';
    amount: bigint;
    wallets: Dictionary<Address, boolean>;
}

export function storeAdminWithdraw(src: AdminWithdraw) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(26200810, 32);
        b_0.storeCoins(src.amount);
        b_0.storeDict(src.wallets, Dictionary.Keys.Address(), Dictionary.Values.Bool());
    };
}

export function loadAdminWithdraw(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 26200810) { throw Error('Invalid prefix'); }
    let _amount = sc_0.loadCoins();
    let _wallets = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.Bool(), sc_0);
    return { $$type: 'AdminWithdraw' as const, amount: _amount, wallets: _wallets };
}

function loadTupleAdminWithdraw(source: TupleReader) {
    let _amount = source.readBigNumber();
    let _wallets = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    return { $$type: 'AdminWithdraw' as const, amount: _amount, wallets: _wallets };
}

function loadGetterTupleAdminWithdraw(source: TupleReader) {
    let _amount = source.readBigNumber();
    let _wallets = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    return { $$type: 'AdminWithdraw' as const, amount: _amount, wallets: _wallets };
}

function storeTupleAdminWithdraw(source: AdminWithdraw) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    builder.writeCell(source.wallets.size > 0 ? beginCell().storeDictDirect(source.wallets, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell() : null);
    return builder.build();
}

function dictValueParserAdminWithdraw(): DictionaryValue<AdminWithdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadAdminWithdraw(src.loadRef().beginParse());
        }
    }
}

export type AdminUpdateFeeBalance = {
    $$type: 'AdminUpdateFeeBalance';
    advertiserFeePercentage: bigint;
    affiliateFeePercentage: bigint;
}

export function storeAdminUpdateFeeBalance(src: AdminUpdateFeeBalance) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2718584125, 32);
        b_0.storeUint(src.advertiserFeePercentage, 32);
        b_0.storeUint(src.affiliateFeePercentage, 32);
    };
}

export function loadAdminUpdateFeeBalance(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2718584125) { throw Error('Invalid prefix'); }
    let _advertiserFeePercentage = sc_0.loadUintBig(32);
    let _affiliateFeePercentage = sc_0.loadUintBig(32);
    return { $$type: 'AdminUpdateFeeBalance' as const, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage };
}

function loadTupleAdminUpdateFeeBalance(source: TupleReader) {
    let _advertiserFeePercentage = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    return { $$type: 'AdminUpdateFeeBalance' as const, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage };
}

function loadGetterTupleAdminUpdateFeeBalance(source: TupleReader) {
    let _advertiserFeePercentage = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    return { $$type: 'AdminUpdateFeeBalance' as const, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage };
}

function storeTupleAdminUpdateFeeBalance(source: AdminUpdateFeeBalance) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.advertiserFeePercentage);
    builder.writeNumber(source.affiliateFeePercentage);
    return builder.build();
}

function dictValueParserAdminUpdateFeeBalance(): DictionaryValue<AdminUpdateFeeBalance> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminUpdateFeeBalance(src)).endCell());
        },
        parse: (src) => {
            return loadAdminUpdateFeeBalance(src.loadRef().beginParse());
        }
    }
}

export type AdminReplenish = {
    $$type: 'AdminReplenish';
}

export function storeAdminReplenish(src: AdminReplenish) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(58961501, 32);
    };
}

export function loadAdminReplenish(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 58961501) { throw Error('Invalid prefix'); }
    return { $$type: 'AdminReplenish' as const };
}

function loadTupleAdminReplenish(source: TupleReader) {
    return { $$type: 'AdminReplenish' as const };
}

function loadGetterTupleAdminReplenish(source: TupleReader) {
    return { $$type: 'AdminReplenish' as const };
}

function storeTupleAdminReplenish(source: AdminReplenish) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserAdminReplenish(): DictionaryValue<AdminReplenish> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminReplenish(src)).endCell());
        },
        parse: (src) => {
            return loadAdminReplenish(src.loadRef().beginParse());
        }
    }
}

export type AdminModifyCampaignFeePercentage = {
    $$type: 'AdminModifyCampaignFeePercentage';
    campaignId: bigint;
    advertiser: Address;
    feePercentage: bigint;
}

export function storeAdminModifyCampaignFeePercentage(src: AdminModifyCampaignFeePercentage) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1116890518, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.feePercentage, 32);
    };
}

export function loadAdminModifyCampaignFeePercentage(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1116890518) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _feePercentage = sc_0.loadUintBig(32);
    return { $$type: 'AdminModifyCampaignFeePercentage' as const, campaignId: _campaignId, advertiser: _advertiser, feePercentage: _feePercentage };
}

function loadTupleAdminModifyCampaignFeePercentage(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _feePercentage = source.readBigNumber();
    return { $$type: 'AdminModifyCampaignFeePercentage' as const, campaignId: _campaignId, advertiser: _advertiser, feePercentage: _feePercentage };
}

function loadGetterTupleAdminModifyCampaignFeePercentage(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _feePercentage = source.readBigNumber();
    return { $$type: 'AdminModifyCampaignFeePercentage' as const, campaignId: _campaignId, advertiser: _advertiser, feePercentage: _feePercentage };
}

function storeTupleAdminModifyCampaignFeePercentage(source: AdminModifyCampaignFeePercentage) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.feePercentage);
    return builder.build();
}

function dictValueParserAdminModifyCampaignFeePercentage(): DictionaryValue<AdminModifyCampaignFeePercentage> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminModifyCampaignFeePercentage(src)).endCell());
        },
        parse: (src) => {
            return loadAdminModifyCampaignFeePercentage(src.loadRef().beginParse());
        }
    }
}

export type AdminStopCampaign = {
    $$type: 'AdminStopCampaign';
    campaignId: bigint;
    advertiser: Address;
}

export function storeAdminStopCampaign(src: AdminStopCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1822632228, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadAdminStopCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1822632228) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'AdminStopCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleAdminStopCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminStopCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleAdminStopCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminStopCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleAdminStopCampaign(source: AdminStopCampaign) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserAdminStopCampaign(): DictionaryValue<AdminStopCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminStopCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadAdminStopCampaign(src.loadRef().beginParse());
        }
    }
}

export type AdminResumeCampaign = {
    $$type: 'AdminResumeCampaign';
    campaignId: bigint;
    advertiser: Address;
}

export function storeAdminResumeCampaign(src: AdminResumeCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(460159264, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadAdminResumeCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 460159264) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'AdminResumeCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleAdminResumeCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminResumeCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleAdminResumeCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminResumeCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleAdminResumeCampaign(source: AdminResumeCampaign) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserAdminResumeCampaign(): DictionaryValue<AdminResumeCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminResumeCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadAdminResumeCampaign(src.loadRef().beginParse());
        }
    }
}

export type AdminSeizeCampaignBalance = {
    $$type: 'AdminSeizeCampaignBalance';
    campaignId: bigint;
    advertiser: Address;
}

export function storeAdminSeizeCampaignBalance(src: AdminSeizeCampaignBalance) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1433233099, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadAdminSeizeCampaignBalance(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1433233099) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'AdminSeizeCampaignBalance' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleAdminSeizeCampaignBalance(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminSeizeCampaignBalance' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleAdminSeizeCampaignBalance(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdminSeizeCampaignBalance' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleAdminSeizeCampaignBalance(source: AdminSeizeCampaignBalance) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserAdminSeizeCampaignBalance(): DictionaryValue<AdminSeizeCampaignBalance> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminSeizeCampaignBalance(src)).endCell());
        },
        parse: (src) => {
            return loadAdminSeizeCampaignBalance(src.loadRef().beginParse());
        }
    }
}

export type AdminJettonNotificationMessageFailure = {
    $$type: 'AdminJettonNotificationMessageFailure';
    campaignId: bigint;
    advertiser: Address;
    amount: bigint;
}

export function storeAdminJettonNotificationMessageFailure(src: AdminJettonNotificationMessageFailure) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3769391455, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeCoins(src.amount);
    };
}

export function loadAdminJettonNotificationMessageFailure(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3769391455) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _amount = sc_0.loadCoins();
    return { $$type: 'AdminJettonNotificationMessageFailure' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadTupleAdminJettonNotificationMessageFailure(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminJettonNotificationMessageFailure' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadGetterTupleAdminJettonNotificationMessageFailure(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminJettonNotificationMessageFailure' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function storeTupleAdminJettonNotificationMessageFailure(source: AdminJettonNotificationMessageFailure) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserAdminJettonNotificationMessageFailure(): DictionaryValue<AdminJettonNotificationMessageFailure> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminJettonNotificationMessageFailure(src)).endCell());
        },
        parse: (src) => {
            return loadAdminJettonNotificationMessageFailure(src.loadRef().beginParse());
        }
    }
}

export type AdminWithdrawUSDTToPayout = {
    $$type: 'AdminWithdrawUSDTToPayout';
    campaignId: bigint;
    advertiser: Address;
    amount: bigint;
}

export function storeAdminWithdrawUSDTToPayout(src: AdminWithdrawUSDTToPayout) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2703619106, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeCoins(src.amount);
    };
}

export function loadAdminWithdrawUSDTToPayout(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2703619106) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _amount = sc_0.loadCoins();
    return { $$type: 'AdminWithdrawUSDTToPayout' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadTupleAdminWithdrawUSDTToPayout(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminWithdrawUSDTToPayout' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadGetterTupleAdminWithdrawUSDTToPayout(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminWithdrawUSDTToPayout' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function storeTupleAdminWithdrawUSDTToPayout(source: AdminWithdrawUSDTToPayout) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserAdminWithdrawUSDTToPayout(): DictionaryValue<AdminWithdrawUSDTToPayout> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminWithdrawUSDTToPayout(src)).endCell());
        },
        parse: (src) => {
            return loadAdminWithdrawUSDTToPayout(src.loadRef().beginParse());
        }
    }
}

export type AdminPayAffiliateUSDTBounced = {
    $$type: 'AdminPayAffiliateUSDTBounced';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    amount: bigint;
}

export function storeAdminPayAffiliateUSDTBounced(src: AdminPayAffiliateUSDTBounced) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1452035766, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 64);
        b_0.storeCoins(src.amount);
    };
}

export function loadAdminPayAffiliateUSDTBounced(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1452035766) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(64);
    let _amount = sc_0.loadCoins();
    return { $$type: 'AdminPayAffiliateUSDTBounced' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, amount: _amount };
}

function loadTupleAdminPayAffiliateUSDTBounced(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminPayAffiliateUSDTBounced' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, amount: _amount };
}

function loadGetterTupleAdminPayAffiliateUSDTBounced(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'AdminPayAffiliateUSDTBounced' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, amount: _amount };
}

function storeTupleAdminPayAffiliateUSDTBounced(source: AdminPayAffiliateUSDTBounced) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserAdminPayAffiliateUSDTBounced(): DictionaryValue<AdminPayAffiliateUSDTBounced> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdminPayAffiliateUSDTBounced(src)).endCell());
        },
        parse: (src) => {
            return loadAdminPayAffiliateUSDTBounced(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserWithdrawFundsEvent = {
    $$type: 'AdvertiserWithdrawFundsEvent';
    campaignId: bigint;
    advertiser: Address;
    amount: bigint;
}

export function storeAdvertiserWithdrawFundsEvent(src: AdvertiserWithdrawFundsEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3552449590, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeCoins(src.amount);
    };
}

export function loadAdvertiserWithdrawFundsEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3552449590) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _amount = sc_0.loadCoins();
    return { $$type: 'AdvertiserWithdrawFundsEvent' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadTupleAdvertiserWithdrawFundsEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdvertiserWithdrawFundsEvent' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadGetterTupleAdvertiserWithdrawFundsEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'AdvertiserWithdrawFundsEvent' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function storeTupleAdvertiserWithdrawFundsEvent(source: AdvertiserWithdrawFundsEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserAdvertiserWithdrawFundsEvent(): DictionaryValue<AdvertiserWithdrawFundsEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserWithdrawFundsEvent(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserWithdrawFundsEvent(src.loadRef().beginParse());
        }
    }
}

export type CampaignCreatedEvent = {
    $$type: 'CampaignCreatedEvent';
    campaignId: bigint;
    advertiser: Address;
    campaignContractAddress: Address;
}

export function storeCampaignCreatedEvent(src: CampaignCreatedEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2452245169, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.campaignContractAddress);
    };
}

export function loadCampaignCreatedEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2452245169) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _campaignContractAddress = sc_0.loadAddress();
    return { $$type: 'CampaignCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, campaignContractAddress: _campaignContractAddress };
}

function loadTupleCampaignCreatedEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _campaignContractAddress = source.readAddress();
    return { $$type: 'CampaignCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, campaignContractAddress: _campaignContractAddress };
}

function loadGetterTupleCampaignCreatedEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _campaignContractAddress = source.readAddress();
    return { $$type: 'CampaignCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, campaignContractAddress: _campaignContractAddress };
}

function storeTupleCampaignCreatedEvent(source: CampaignCreatedEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeAddress(source.campaignContractAddress);
    return builder.build();
}

function dictValueParserCampaignCreatedEvent(): DictionaryValue<CampaignCreatedEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCampaignCreatedEvent(src)).endCell());
        },
        parse: (src) => {
            return loadCampaignCreatedEvent(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserSignedCampaignDetailsEvent = {
    $$type: 'AdvertiserSignedCampaignDetailsEvent';
    campaignId: bigint;
    advertiser: Address;
}

export function storeAdvertiserSignedCampaignDetailsEvent(src: AdvertiserSignedCampaignDetailsEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1529127575, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadAdvertiserSignedCampaignDetailsEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1529127575) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'AdvertiserSignedCampaignDetailsEvent' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleAdvertiserSignedCampaignDetailsEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdvertiserSignedCampaignDetailsEvent' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleAdvertiserSignedCampaignDetailsEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'AdvertiserSignedCampaignDetailsEvent' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleAdvertiserSignedCampaignDetailsEvent(source: AdvertiserSignedCampaignDetailsEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserAdvertiserSignedCampaignDetailsEvent(): DictionaryValue<AdvertiserSignedCampaignDetailsEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserSignedCampaignDetailsEvent(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserSignedCampaignDetailsEvent(src.loadRef().beginParse());
        }
    }
}

export type AffiliateCreatedEvent = {
    $$type: 'AffiliateCreatedEvent';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    affiliate: Address;
    state: bigint;
}

export function storeAffiliateCreatedEvent(src: AffiliateCreatedEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2267067737, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.affiliate);
        b_0.storeUint(src.state, 8);
    };
}

export function loadAffiliateCreatedEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2267067737) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(32);
    let _affiliate = sc_0.loadAddress();
    let _state = sc_0.loadUintBig(8);
    return { $$type: 'AffiliateCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate, state: _state };
}

function loadTupleAffiliateCreatedEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    return { $$type: 'AffiliateCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate, state: _state };
}

function loadGetterTupleAffiliateCreatedEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    return { $$type: 'AffiliateCreatedEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate, state: _state };
}

function storeTupleAffiliateCreatedEvent(source: AffiliateCreatedEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.affiliate);
    builder.writeNumber(source.state);
    return builder.build();
}

function dictValueParserAffiliateCreatedEvent(): DictionaryValue<AffiliateCreatedEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAffiliateCreatedEvent(src)).endCell());
        },
        parse: (src) => {
            return loadAffiliateCreatedEvent(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserRemovedAffiliateEvent = {
    $$type: 'AdvertiserRemovedAffiliateEvent';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    affiliate: Address;
}

export function storeAdvertiserRemovedAffiliateEvent(src: AdvertiserRemovedAffiliateEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1530383439, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.affiliate);
    };
}

export function loadAdvertiserRemovedAffiliateEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1530383439) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(32);
    let _affiliate = sc_0.loadAddress();
    return { $$type: 'AdvertiserRemovedAffiliateEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadTupleAdvertiserRemovedAffiliateEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'AdvertiserRemovedAffiliateEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadGetterTupleAdvertiserRemovedAffiliateEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'AdvertiserRemovedAffiliateEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function storeTupleAdvertiserRemovedAffiliateEvent(source: AdvertiserRemovedAffiliateEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.affiliate);
    return builder.build();
}

function dictValueParserAdvertiserRemovedAffiliateEvent(): DictionaryValue<AdvertiserRemovedAffiliateEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserRemovedAffiliateEvent(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserRemovedAffiliateEvent(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserApprovedAffiliateListEvent = {
    $$type: 'AdvertiserApprovedAffiliateListEvent';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    affiliate: Address;
}

export function storeAdvertiserApprovedAffiliateListEvent(src: AdvertiserApprovedAffiliateListEvent) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(4109738705, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.affiliate);
    };
}

export function loadAdvertiserApprovedAffiliateListEvent(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 4109738705) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(32);
    let _affiliate = sc_0.loadAddress();
    return { $$type: 'AdvertiserApprovedAffiliateListEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadTupleAdvertiserApprovedAffiliateListEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'AdvertiserApprovedAffiliateListEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadGetterTupleAdvertiserApprovedAffiliateListEvent(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'AdvertiserApprovedAffiliateListEvent' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function storeTupleAdvertiserApprovedAffiliateListEvent(source: AdvertiserApprovedAffiliateListEvent) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.affiliate);
    return builder.build();
}

function dictValueParserAdvertiserApprovedAffiliateListEvent(): DictionaryValue<AdvertiserApprovedAffiliateListEvent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserApprovedAffiliateListEvent(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserApprovedAffiliateListEvent(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserDeployNewCampaign = {
    $$type: 'AdvertiserDeployNewCampaign';
}

export function storeAdvertiserDeployNewCampaign(src: AdvertiserDeployNewCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1179651103, 32);
    };
}

export function loadAdvertiserDeployNewCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179651103) { throw Error('Invalid prefix'); }
    return { $$type: 'AdvertiserDeployNewCampaign' as const };
}

function loadTupleAdvertiserDeployNewCampaign(source: TupleReader) {
    return { $$type: 'AdvertiserDeployNewCampaign' as const };
}

function loadGetterTupleAdvertiserDeployNewCampaign(source: TupleReader) {
    return { $$type: 'AdvertiserDeployNewCampaign' as const };
}

function storeTupleAdvertiserDeployNewCampaign(source: AdvertiserDeployNewCampaign) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserAdvertiserDeployNewCampaign(): DictionaryValue<AdvertiserDeployNewCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserDeployNewCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserDeployNewCampaign(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildDeployCampaign = {
    $$type: 'ParentToChildDeployCampaign';
    campaignId: bigint;
    advertiser: Address;
}

export function storeParentToChildDeployCampaign(src: ParentToChildDeployCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1292517596, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadParentToChildDeployCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1292517596) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'ParentToChildDeployCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleParentToChildDeployCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ParentToChildDeployCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleParentToChildDeployCampaign(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ParentToChildDeployCampaign' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleParentToChildDeployCampaign(source: ParentToChildDeployCampaign) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserParentToChildDeployCampaign(): DictionaryValue<ParentToChildDeployCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildDeployCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildDeployCampaign(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildUpdateFeePercentage = {
    $$type: 'ParentToChildUpdateFeePercentage';
    feePercentage: bigint;
}

export function storeParentToChildUpdateFeePercentage(src: ParentToChildUpdateFeePercentage) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2049922941, 32);
        b_0.storeUint(src.feePercentage, 32);
    };
}

export function loadParentToChildUpdateFeePercentage(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2049922941) { throw Error('Invalid prefix'); }
    let _feePercentage = sc_0.loadUintBig(32);
    return { $$type: 'ParentToChildUpdateFeePercentage' as const, feePercentage: _feePercentage };
}

function loadTupleParentToChildUpdateFeePercentage(source: TupleReader) {
    let _feePercentage = source.readBigNumber();
    return { $$type: 'ParentToChildUpdateFeePercentage' as const, feePercentage: _feePercentage };
}

function loadGetterTupleParentToChildUpdateFeePercentage(source: TupleReader) {
    let _feePercentage = source.readBigNumber();
    return { $$type: 'ParentToChildUpdateFeePercentage' as const, feePercentage: _feePercentage };
}

function storeTupleParentToChildUpdateFeePercentage(source: ParentToChildUpdateFeePercentage) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.feePercentage);
    return builder.build();
}

function dictValueParserParentToChildUpdateFeePercentage(): DictionaryValue<ParentToChildUpdateFeePercentage> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildUpdateFeePercentage(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildUpdateFeePercentage(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildSeizeCampaign = {
    $$type: 'ParentToChildSeizeCampaign';
}

export function storeParentToChildSeizeCampaign(src: ParentToChildSeizeCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(340595563, 32);
    };
}

export function loadParentToChildSeizeCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 340595563) { throw Error('Invalid prefix'); }
    return { $$type: 'ParentToChildSeizeCampaign' as const };
}

function loadTupleParentToChildSeizeCampaign(source: TupleReader) {
    return { $$type: 'ParentToChildSeizeCampaign' as const };
}

function loadGetterTupleParentToChildSeizeCampaign(source: TupleReader) {
    return { $$type: 'ParentToChildSeizeCampaign' as const };
}

function storeTupleParentToChildSeizeCampaign(source: ParentToChildSeizeCampaign) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserParentToChildSeizeCampaign(): DictionaryValue<ParentToChildSeizeCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildSeizeCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildSeizeCampaign(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildJettonNotificationMessageFailure = {
    $$type: 'ParentToChildJettonNotificationMessageFailure';
    amount: bigint;
}

export function storeParentToChildJettonNotificationMessageFailure(src: ParentToChildJettonNotificationMessageFailure) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1354800261, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadParentToChildJettonNotificationMessageFailure(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1354800261) { throw Error('Invalid prefix'); }
    let _amount = sc_0.loadCoins();
    return { $$type: 'ParentToChildJettonNotificationMessageFailure' as const, amount: _amount };
}

function loadTupleParentToChildJettonNotificationMessageFailure(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildJettonNotificationMessageFailure' as const, amount: _amount };
}

function loadGetterTupleParentToChildJettonNotificationMessageFailure(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildJettonNotificationMessageFailure' as const, amount: _amount };
}

function storeTupleParentToChildJettonNotificationMessageFailure(source: ParentToChildJettonNotificationMessageFailure) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserParentToChildJettonNotificationMessageFailure(): DictionaryValue<ParentToChildJettonNotificationMessageFailure> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildJettonNotificationMessageFailure(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildJettonNotificationMessageFailure(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildWithdrawUSDTToPayout = {
    $$type: 'ParentToChildWithdrawUSDTToPayout';
    amount: bigint;
}

export function storeParentToChildWithdrawUSDTToPayout(src: ParentToChildWithdrawUSDTToPayout) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2232130989, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadParentToChildWithdrawUSDTToPayout(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2232130989) { throw Error('Invalid prefix'); }
    let _amount = sc_0.loadCoins();
    return { $$type: 'ParentToChildWithdrawUSDTToPayout' as const, amount: _amount };
}

function loadTupleParentToChildWithdrawUSDTToPayout(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildWithdrawUSDTToPayout' as const, amount: _amount };
}

function loadGetterTupleParentToChildWithdrawUSDTToPayout(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildWithdrawUSDTToPayout' as const, amount: _amount };
}

function storeTupleParentToChildWithdrawUSDTToPayout(source: ParentToChildWithdrawUSDTToPayout) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserParentToChildWithdrawUSDTToPayout(): DictionaryValue<ParentToChildWithdrawUSDTToPayout> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildWithdrawUSDTToPayout(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildWithdrawUSDTToPayout(src.loadRef().beginParse());
        }
    }
}

export type ParentToChildPayAffiliateUSDTBounced = {
    $$type: 'ParentToChildPayAffiliateUSDTBounced';
    affiliateId: bigint;
    amount: bigint;
}

export function storeParentToChildPayAffiliateUSDTBounced(src: ParentToChildPayAffiliateUSDTBounced) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2591643766, 32);
        b_0.storeUint(src.affiliateId, 64);
        b_0.storeCoins(src.amount);
    };
}

export function loadParentToChildPayAffiliateUSDTBounced(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2591643766) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(64);
    let _amount = sc_0.loadCoins();
    return { $$type: 'ParentToChildPayAffiliateUSDTBounced' as const, affiliateId: _affiliateId, amount: _amount };
}

function loadTupleParentToChildPayAffiliateUSDTBounced(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildPayAffiliateUSDTBounced' as const, affiliateId: _affiliateId, amount: _amount };
}

function loadGetterTupleParentToChildPayAffiliateUSDTBounced(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'ParentToChildPayAffiliateUSDTBounced' as const, affiliateId: _affiliateId, amount: _amount };
}

function storeTupleParentToChildPayAffiliateUSDTBounced(source: ParentToChildPayAffiliateUSDTBounced) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserParentToChildPayAffiliateUSDTBounced(): DictionaryValue<ParentToChildPayAffiliateUSDTBounced> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeParentToChildPayAffiliateUSDTBounced(src)).endCell());
        },
        parse: (src) => {
            return loadParentToChildPayAffiliateUSDTBounced(src.loadRef().beginParse());
        }
    }
}

export type BotUserAction = {
    $$type: 'BotUserAction';
    affiliateId: bigint;
    userActionOpCode: bigint;
    isPremiumUser: boolean;
}

export function storeBotUserAction(src: BotUserAction) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1940543113, 32);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeUint(src.userActionOpCode, 32);
        b_0.storeBit(src.isPremiumUser);
    };
}

export function loadBotUserAction(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1940543113) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    let _userActionOpCode = sc_0.loadUintBig(32);
    let _isPremiumUser = sc_0.loadBit();
    return { $$type: 'BotUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function loadTupleBotUserAction(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _userActionOpCode = source.readBigNumber();
    let _isPremiumUser = source.readBoolean();
    return { $$type: 'BotUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function loadGetterTupleBotUserAction(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _userActionOpCode = source.readBigNumber();
    let _isPremiumUser = source.readBoolean();
    return { $$type: 'BotUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function storeTupleBotUserAction(source: BotUserAction) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    builder.writeNumber(source.userActionOpCode);
    builder.writeBoolean(source.isPremiumUser);
    return builder.build();
}

function dictValueParserBotUserAction(): DictionaryValue<BotUserAction> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBotUserAction(src)).endCell());
        },
        parse: (src) => {
            return loadBotUserAction(src.loadRef().beginParse());
        }
    }
}

export type PayAffiliate = {
    $$type: 'PayAffiliate';
    affiliateId: bigint;
    amount: bigint;
}

export function storePayAffiliate(src: PayAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2310656706, 32);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadPayAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2310656706) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    let _amount = sc_0.loadCoins();
    return { $$type: 'PayAffiliate' as const, affiliateId: _affiliateId, amount: _amount };
}

function loadTuplePayAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'PayAffiliate' as const, affiliateId: _affiliateId, amount: _amount };
}

function loadGetterTuplePayAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _amount = source.readBigNumber();
    return { $$type: 'PayAffiliate' as const, affiliateId: _affiliateId, amount: _amount };
}

function storeTuplePayAffiliate(source: PayAffiliate) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserPayAffiliate(): DictionaryValue<PayAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storePayAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadPayAffiliate(src.loadRef().beginParse());
        }
    }
}

export type AffiliateCreateNewAffiliate = {
    $$type: 'AffiliateCreateNewAffiliate';
}

export function storeAffiliateCreateNewAffiliate(src: AffiliateCreateNewAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(820291840, 32);
    };
}

export function loadAffiliateCreateNewAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 820291840) { throw Error('Invalid prefix'); }
    return { $$type: 'AffiliateCreateNewAffiliate' as const };
}

function loadTupleAffiliateCreateNewAffiliate(source: TupleReader) {
    return { $$type: 'AffiliateCreateNewAffiliate' as const };
}

function loadGetterTupleAffiliateCreateNewAffiliate(source: TupleReader) {
    return { $$type: 'AffiliateCreateNewAffiliate' as const };
}

function storeTupleAffiliateCreateNewAffiliate(source: AffiliateCreateNewAffiliate) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserAffiliateCreateNewAffiliate(): DictionaryValue<AffiliateCreateNewAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAffiliateCreateNewAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadAffiliateCreateNewAffiliate(src.loadRef().beginParse());
        }
    }
}

export type AffiliateWithdrawEarnings = {
    $$type: 'AffiliateWithdrawEarnings';
    affiliateId: bigint;
}

export function storeAffiliateWithdrawEarnings(src: AffiliateWithdrawEarnings) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2309430758, 32);
        b_0.storeUint(src.affiliateId, 32);
    };
}

export function loadAffiliateWithdrawEarnings(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2309430758) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    return { $$type: 'AffiliateWithdrawEarnings' as const, affiliateId: _affiliateId };
}

function loadTupleAffiliateWithdrawEarnings(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AffiliateWithdrawEarnings' as const, affiliateId: _affiliateId };
}

function loadGetterTupleAffiliateWithdrawEarnings(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AffiliateWithdrawEarnings' as const, affiliateId: _affiliateId };
}

function storeTupleAffiliateWithdrawEarnings(source: AffiliateWithdrawEarnings) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    return builder.build();
}

function dictValueParserAffiliateWithdrawEarnings(): DictionaryValue<AffiliateWithdrawEarnings> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAffiliateWithdrawEarnings(src)).endCell());
        },
        parse: (src) => {
            return loadAffiliateWithdrawEarnings(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserWithdrawFunds = {
    $$type: 'AdvertiserWithdrawFunds';
    amount: bigint;
}

export function storeAdvertiserWithdrawFunds(src: AdvertiserWithdrawFunds) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3579069153, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadAdvertiserWithdrawFunds(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3579069153) { throw Error('Invalid prefix'); }
    let _amount = sc_0.loadCoins();
    return { $$type: 'AdvertiserWithdrawFunds' as const, amount: _amount };
}

function loadTupleAdvertiserWithdrawFunds(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'AdvertiserWithdrawFunds' as const, amount: _amount };
}

function loadGetterTupleAdvertiserWithdrawFunds(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'AdvertiserWithdrawFunds' as const, amount: _amount };
}

function storeTupleAdvertiserWithdrawFunds(source: AdvertiserWithdrawFunds) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserAdvertiserWithdrawFunds(): DictionaryValue<AdvertiserWithdrawFunds> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserWithdrawFunds(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserWithdrawFunds(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserAddNewUserOpCode = {
    $$type: 'AdvertiserAddNewUserOpCode';
    userOpCode: bigint;
    isPremiumUserOpCode: boolean;
    costPerAction: bigint;
}

export function storeAdvertiserAddNewUserOpCode(src: AdvertiserAddNewUserOpCode) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(237456654, 32);
        b_0.storeUint(src.userOpCode, 32);
        b_0.storeBit(src.isPremiumUserOpCode);
        b_0.storeCoins(src.costPerAction);
    };
}

export function loadAdvertiserAddNewUserOpCode(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 237456654) { throw Error('Invalid prefix'); }
    let _userOpCode = sc_0.loadUintBig(32);
    let _isPremiumUserOpCode = sc_0.loadBit();
    let _costPerAction = sc_0.loadCoins();
    return { $$type: 'AdvertiserAddNewUserOpCode' as const, userOpCode: _userOpCode, isPremiumUserOpCode: _isPremiumUserOpCode, costPerAction: _costPerAction };
}

function loadTupleAdvertiserAddNewUserOpCode(source: TupleReader) {
    let _userOpCode = source.readBigNumber();
    let _isPremiumUserOpCode = source.readBoolean();
    let _costPerAction = source.readBigNumber();
    return { $$type: 'AdvertiserAddNewUserOpCode' as const, userOpCode: _userOpCode, isPremiumUserOpCode: _isPremiumUserOpCode, costPerAction: _costPerAction };
}

function loadGetterTupleAdvertiserAddNewUserOpCode(source: TupleReader) {
    let _userOpCode = source.readBigNumber();
    let _isPremiumUserOpCode = source.readBoolean();
    let _costPerAction = source.readBigNumber();
    return { $$type: 'AdvertiserAddNewUserOpCode' as const, userOpCode: _userOpCode, isPremiumUserOpCode: _isPremiumUserOpCode, costPerAction: _costPerAction };
}

function storeTupleAdvertiserAddNewUserOpCode(source: AdvertiserAddNewUserOpCode) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.userOpCode);
    builder.writeBoolean(source.isPremiumUserOpCode);
    builder.writeNumber(source.costPerAction);
    return builder.build();
}

function dictValueParserAdvertiserAddNewUserOpCode(): DictionaryValue<AdvertiserAddNewUserOpCode> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserAddNewUserOpCode(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserAddNewUserOpCode(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserSetCampaignDetails = {
    $$type: 'AdvertiserSetCampaignDetails';
    campaignDetails: CampaignDetails;
}

export function storeAdvertiserSetCampaignDetails(src: AdvertiserSetCampaignDetails) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1253088072, 32);
        b_0.store(storeCampaignDetails(src.campaignDetails));
    };
}

export function loadAdvertiserSetCampaignDetails(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1253088072) { throw Error('Invalid prefix'); }
    let _campaignDetails = loadCampaignDetails(sc_0);
    return { $$type: 'AdvertiserSetCampaignDetails' as const, campaignDetails: _campaignDetails };
}

function loadTupleAdvertiserSetCampaignDetails(source: TupleReader) {
    const _campaignDetails = loadTupleCampaignDetails(source);
    return { $$type: 'AdvertiserSetCampaignDetails' as const, campaignDetails: _campaignDetails };
}

function loadGetterTupleAdvertiserSetCampaignDetails(source: TupleReader) {
    const _campaignDetails = loadGetterTupleCampaignDetails(source);
    return { $$type: 'AdvertiserSetCampaignDetails' as const, campaignDetails: _campaignDetails };
}

function storeTupleAdvertiserSetCampaignDetails(source: AdvertiserSetCampaignDetails) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleCampaignDetails(source.campaignDetails));
    return builder.build();
}

function dictValueParserAdvertiserSetCampaignDetails(): DictionaryValue<AdvertiserSetCampaignDetails> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserSetCampaignDetails(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserSetCampaignDetails(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserUserAction = {
    $$type: 'AdvertiserUserAction';
    affiliateId: bigint;
    userActionOpCode: bigint;
    isPremiumUser: boolean;
}

export function storeAdvertiserUserAction(src: AdvertiserUserAction) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3231438857, 32);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeUint(src.userActionOpCode, 32);
        b_0.storeBit(src.isPremiumUser);
    };
}

export function loadAdvertiserUserAction(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3231438857) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    let _userActionOpCode = sc_0.loadUintBig(32);
    let _isPremiumUser = sc_0.loadBit();
    return { $$type: 'AdvertiserUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function loadTupleAdvertiserUserAction(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _userActionOpCode = source.readBigNumber();
    let _isPremiumUser = source.readBoolean();
    return { $$type: 'AdvertiserUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function loadGetterTupleAdvertiserUserAction(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    let _userActionOpCode = source.readBigNumber();
    let _isPremiumUser = source.readBoolean();
    return { $$type: 'AdvertiserUserAction' as const, affiliateId: _affiliateId, userActionOpCode: _userActionOpCode, isPremiumUser: _isPremiumUser };
}

function storeTupleAdvertiserUserAction(source: AdvertiserUserAction) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    builder.writeNumber(source.userActionOpCode);
    builder.writeBoolean(source.isPremiumUser);
    return builder.build();
}

function dictValueParserAdvertiserUserAction(): DictionaryValue<AdvertiserUserAction> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserUserAction(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserUserAction(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserRemoveAffiliate = {
    $$type: 'AdvertiserRemoveAffiliate';
    affiliateId: bigint;
}

export function storeAdvertiserRemoveAffiliate(src: AdvertiserRemoveAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2637094481, 32);
        b_0.storeUint(src.affiliateId, 32);
    };
}

export function loadAdvertiserRemoveAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2637094481) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    return { $$type: 'AdvertiserRemoveAffiliate' as const, affiliateId: _affiliateId };
}

function loadTupleAdvertiserRemoveAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AdvertiserRemoveAffiliate' as const, affiliateId: _affiliateId };
}

function loadGetterTupleAdvertiserRemoveAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AdvertiserRemoveAffiliate' as const, affiliateId: _affiliateId };
}

function storeTupleAdvertiserRemoveAffiliate(source: AdvertiserRemoveAffiliate) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    return builder.build();
}

function dictValueParserAdvertiserRemoveAffiliate(): DictionaryValue<AdvertiserRemoveAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserRemoveAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserRemoveAffiliate(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserApproveAffiliate = {
    $$type: 'AdvertiserApproveAffiliate';
    affiliateId: bigint;
}

export function storeAdvertiserApproveAffiliate(src: AdvertiserApproveAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1560570076, 32);
        b_0.storeUint(src.affiliateId, 32);
    };
}

export function loadAdvertiserApproveAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1560570076) { throw Error('Invalid prefix'); }
    let _affiliateId = sc_0.loadUintBig(32);
    return { $$type: 'AdvertiserApproveAffiliate' as const, affiliateId: _affiliateId };
}

function loadTupleAdvertiserApproveAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AdvertiserApproveAffiliate' as const, affiliateId: _affiliateId };
}

function loadGetterTupleAdvertiserApproveAffiliate(source: TupleReader) {
    let _affiliateId = source.readBigNumber();
    return { $$type: 'AdvertiserApproveAffiliate' as const, affiliateId: _affiliateId };
}

function storeTupleAdvertiserApproveAffiliate(source: AdvertiserApproveAffiliate) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.affiliateId);
    return builder.build();
}

function dictValueParserAdvertiserApproveAffiliate(): DictionaryValue<AdvertiserApproveAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserApproveAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserApproveAffiliate(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserReplenish = {
    $$type: 'AdvertiserReplenish';
}

export function storeAdvertiserReplenish(src: AdvertiserReplenish) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1319387318, 32);
    };
}

export function loadAdvertiserReplenish(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1319387318) { throw Error('Invalid prefix'); }
    return { $$type: 'AdvertiserReplenish' as const };
}

function loadTupleAdvertiserReplenish(source: TupleReader) {
    return { $$type: 'AdvertiserReplenish' as const };
}

function loadGetterTupleAdvertiserReplenish(source: TupleReader) {
    return { $$type: 'AdvertiserReplenish' as const };
}

function storeTupleAdvertiserReplenish(source: AdvertiserReplenish) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserAdvertiserReplenish(): DictionaryValue<AdvertiserReplenish> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserReplenish(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserReplenish(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserReplenishGasFeesForUSDTCampaign = {
    $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign';
}

export function storeAdvertiserReplenishGasFeesForUSDTCampaign(src: AdvertiserReplenishGasFeesForUSDTCampaign) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3170273034, 32);
    };
}

export function loadAdvertiserReplenishGasFeesForUSDTCampaign(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3170273034) { throw Error('Invalid prefix'); }
    return { $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign' as const };
}

function loadTupleAdvertiserReplenishGasFeesForUSDTCampaign(source: TupleReader) {
    return { $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign' as const };
}

function loadGetterTupleAdvertiserReplenishGasFeesForUSDTCampaign(source: TupleReader) {
    return { $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign' as const };
}

function storeTupleAdvertiserReplenishGasFeesForUSDTCampaign(source: AdvertiserReplenishGasFeesForUSDTCampaign) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserAdvertiserReplenishGasFeesForUSDTCampaign(): DictionaryValue<AdvertiserReplenishGasFeesForUSDTCampaign> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserReplenishGasFeesForUSDTCampaign(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserReplenishGasFeesForUSDTCampaign(src.loadRef().beginParse());
        }
    }
}

export type AdvertiserSignOffWithdraw = {
    $$type: 'AdvertiserSignOffWithdraw';
    setAffiliatesWithdrawEarnings: Dictionary<bigint, bigint>;
}

export function storeAdvertiserSignOffWithdraw(src: AdvertiserSignOffWithdraw) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2469363792, 32);
        b_0.storeDict(src.setAffiliatesWithdrawEarnings, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
    };
}

export function loadAdvertiserSignOffWithdraw(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2469363792) { throw Error('Invalid prefix'); }
    let _setAffiliatesWithdrawEarnings = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_0);
    return { $$type: 'AdvertiserSignOffWithdraw' as const, setAffiliatesWithdrawEarnings: _setAffiliatesWithdrawEarnings };
}

function loadTupleAdvertiserSignOffWithdraw(source: TupleReader) {
    let _setAffiliatesWithdrawEarnings = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    return { $$type: 'AdvertiserSignOffWithdraw' as const, setAffiliatesWithdrawEarnings: _setAffiliatesWithdrawEarnings };
}

function loadGetterTupleAdvertiserSignOffWithdraw(source: TupleReader) {
    let _setAffiliatesWithdrawEarnings = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    return { $$type: 'AdvertiserSignOffWithdraw' as const, setAffiliatesWithdrawEarnings: _setAffiliatesWithdrawEarnings };
}

function storeTupleAdvertiserSignOffWithdraw(source: AdvertiserSignOffWithdraw) {
    let builder = new TupleBuilder();
    builder.writeCell(source.setAffiliatesWithdrawEarnings.size > 0 ? beginCell().storeDictDirect(source.setAffiliatesWithdrawEarnings, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    return builder.build();
}

function dictValueParserAdvertiserSignOffWithdraw(): DictionaryValue<AdvertiserSignOffWithdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdvertiserSignOffWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadAdvertiserSignOffWithdraw(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentCampaignDeployedSuccessfully = {
    $$type: 'ChildToParentCampaignDeployedSuccessfully';
    campaignId: bigint;
    advertiser: Address;
}

export function storeChildToParentCampaignDeployedSuccessfully(src: ChildToParentCampaignDeployedSuccessfully) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(370750836, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadChildToParentCampaignDeployedSuccessfully(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 370750836) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'ChildToParentCampaignDeployedSuccessfully' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleChildToParentCampaignDeployedSuccessfully(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ChildToParentCampaignDeployedSuccessfully' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleChildToParentCampaignDeployedSuccessfully(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ChildToParentCampaignDeployedSuccessfully' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleChildToParentCampaignDeployedSuccessfully(source: ChildToParentCampaignDeployedSuccessfully) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserChildToParentCampaignDeployedSuccessfully(): DictionaryValue<ChildToParentCampaignDeployedSuccessfully> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentCampaignDeployedSuccessfully(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentCampaignDeployedSuccessfully(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentAffiliateCreated = {
    $$type: 'ChildToParentAffiliateCreated';
    campaignId: bigint;
    affiliateId: bigint;
    advertiser: Address;
    affiliate: Address;
    state: bigint;
}

export function storeChildToParentAffiliateCreated(src: ChildToParentAffiliateCreated) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3477708169, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.affiliate);
        b_0.storeUint(src.state, 8);
    };
}

export function loadChildToParentAffiliateCreated(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3477708169) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _affiliateId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliate = sc_0.loadAddress();
    let _state = sc_0.loadUintBig(8);
    return { $$type: 'ChildToParentAffiliateCreated' as const, campaignId: _campaignId, affiliateId: _affiliateId, advertiser: _advertiser, affiliate: _affiliate, state: _state };
}

function loadTupleChildToParentAffiliateCreated(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _affiliateId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    return { $$type: 'ChildToParentAffiliateCreated' as const, campaignId: _campaignId, affiliateId: _affiliateId, advertiser: _advertiser, affiliate: _affiliate, state: _state };
}

function loadGetterTupleChildToParentAffiliateCreated(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _affiliateId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    return { $$type: 'ChildToParentAffiliateCreated' as const, campaignId: _campaignId, affiliateId: _affiliateId, advertiser: _advertiser, affiliate: _affiliate, state: _state };
}

function storeTupleChildToParentAffiliateCreated(source: ChildToParentAffiliateCreated) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.advertiser);
    builder.writeAddress(source.affiliate);
    builder.writeNumber(source.state);
    return builder.build();
}

function dictValueParserChildToParentAffiliateCreated(): DictionaryValue<ChildToParentAffiliateCreated> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentAffiliateCreated(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentAffiliateCreated(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentAdvertiserSignedCampaignDetails = {
    $$type: 'ChildToParentAdvertiserSignedCampaignDetails';
    campaignId: bigint;
    advertiser: Address;
}

export function storeChildToParentAdvertiserSignedCampaignDetails(src: ChildToParentAdvertiserSignedCampaignDetails) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1248894233, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
    };
}

export function loadChildToParentAdvertiserSignedCampaignDetails(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1248894233) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    return { $$type: 'ChildToParentAdvertiserSignedCampaignDetails' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadTupleChildToParentAdvertiserSignedCampaignDetails(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserSignedCampaignDetails' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function loadGetterTupleChildToParentAdvertiserSignedCampaignDetails(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserSignedCampaignDetails' as const, campaignId: _campaignId, advertiser: _advertiser };
}

function storeTupleChildToParentAdvertiserSignedCampaignDetails(source: ChildToParentAdvertiserSignedCampaignDetails) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    return builder.build();
}

function dictValueParserChildToParentAdvertiserSignedCampaignDetails(): DictionaryValue<ChildToParentAdvertiserSignedCampaignDetails> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentAdvertiserSignedCampaignDetails(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentAdvertiserSignedCampaignDetails(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentAdvertiserWithdrawFunds = {
    $$type: 'ChildToParentAdvertiserWithdrawFunds';
    campaignId: bigint;
    advertiser: Address;
    amount: bigint;
}

export function storeChildToParentAdvertiserWithdrawFunds(src: ChildToParentAdvertiserWithdrawFunds) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2584288256, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeCoins(src.amount);
    };
}

export function loadChildToParentAdvertiserWithdrawFunds(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2584288256) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _amount = sc_0.loadCoins();
    return { $$type: 'ChildToParentAdvertiserWithdrawFunds' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadTupleChildToParentAdvertiserWithdrawFunds(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'ChildToParentAdvertiserWithdrawFunds' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function loadGetterTupleChildToParentAdvertiserWithdrawFunds(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _amount = source.readBigNumber();
    return { $$type: 'ChildToParentAdvertiserWithdrawFunds' as const, campaignId: _campaignId, advertiser: _advertiser, amount: _amount };
}

function storeTupleChildToParentAdvertiserWithdrawFunds(source: ChildToParentAdvertiserWithdrawFunds) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserChildToParentAdvertiserWithdrawFunds(): DictionaryValue<ChildToParentAdvertiserWithdrawFunds> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentAdvertiserWithdrawFunds(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentAdvertiserWithdrawFunds(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentAdvertiserApprovedAffiliate = {
    $$type: 'ChildToParentAdvertiserApprovedAffiliate';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    affiliate: Address;
}

export function storeChildToParentAdvertiserApprovedAffiliate(src: ChildToParentAdvertiserApprovedAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1498234406, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.affiliate);
    };
}

export function loadChildToParentAdvertiserApprovedAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1498234406) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(32);
    let _affiliate = sc_0.loadAddress();
    return { $$type: 'ChildToParentAdvertiserApprovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadTupleChildToParentAdvertiserApprovedAffiliate(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserApprovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadGetterTupleChildToParentAdvertiserApprovedAffiliate(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserApprovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function storeTupleChildToParentAdvertiserApprovedAffiliate(source: ChildToParentAdvertiserApprovedAffiliate) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.affiliate);
    return builder.build();
}

function dictValueParserChildToParentAdvertiserApprovedAffiliate(): DictionaryValue<ChildToParentAdvertiserApprovedAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentAdvertiserApprovedAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentAdvertiserApprovedAffiliate(src.loadRef().beginParse());
        }
    }
}

export type ChildToParentAdvertiserRemovedAffiliate = {
    $$type: 'ChildToParentAdvertiserRemovedAffiliate';
    campaignId: bigint;
    advertiser: Address;
    affiliateId: bigint;
    affiliate: Address;
}

export function storeChildToParentAdvertiserRemovedAffiliate(src: ChildToParentAdvertiserRemovedAffiliate) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2190513838, 32);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeUint(src.affiliateId, 32);
        b_0.storeAddress(src.affiliate);
    };
}

export function loadChildToParentAdvertiserRemovedAffiliate(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2190513838) { throw Error('Invalid prefix'); }
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _affiliateId = sc_0.loadUintBig(32);
    let _affiliate = sc_0.loadAddress();
    return { $$type: 'ChildToParentAdvertiserRemovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadTupleChildToParentAdvertiserRemovedAffiliate(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserRemovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function loadGetterTupleChildToParentAdvertiserRemovedAffiliate(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _affiliateId = source.readBigNumber();
    let _affiliate = source.readAddress();
    return { $$type: 'ChildToParentAdvertiserRemovedAffiliate' as const, campaignId: _campaignId, advertiser: _advertiser, affiliateId: _affiliateId, affiliate: _affiliate };
}

function storeTupleChildToParentAdvertiserRemovedAffiliate(source: ChildToParentAdvertiserRemovedAffiliate) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeNumber(source.affiliateId);
    builder.writeAddress(source.affiliate);
    return builder.build();
}

function dictValueParserChildToParentAdvertiserRemovedAffiliate(): DictionaryValue<ChildToParentAdvertiserRemovedAffiliate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChildToParentAdvertiserRemovedAffiliate(src)).endCell());
        },
        parse: (src) => {
            return loadChildToParentAdvertiserRemovedAffiliate(src.loadRef().beginParse());
        }
    }
}

export type JettonTransferNotification = {
    $$type: 'JettonTransferNotification';
    queryId: bigint;
    amount: bigint;
    sender: Address;
    forwardPayload: Slice;
}

export function storeJettonTransferNotification(src: JettonTransferNotification) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1935855772, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.sender);
        b_0.storeBuilder(src.forwardPayload.asBuilder());
    };
}

export function loadJettonTransferNotification(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1935855772) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _amount = sc_0.loadCoins();
    let _sender = sc_0.loadAddress();
    let _forwardPayload = sc_0;
    return { $$type: 'JettonTransferNotification' as const, queryId: _queryId, amount: _amount, sender: _sender, forwardPayload: _forwardPayload };
}

function loadTupleJettonTransferNotification(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _sender = source.readAddress();
    let _forwardPayload = source.readCell().asSlice();
    return { $$type: 'JettonTransferNotification' as const, queryId: _queryId, amount: _amount, sender: _sender, forwardPayload: _forwardPayload };
}

function loadGetterTupleJettonTransferNotification(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _sender = source.readAddress();
    let _forwardPayload = source.readCell().asSlice();
    return { $$type: 'JettonTransferNotification' as const, queryId: _queryId, amount: _amount, sender: _sender, forwardPayload: _forwardPayload };
}

function storeTupleJettonTransferNotification(source: JettonTransferNotification) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.sender);
    builder.writeSlice(source.forwardPayload.asCell());
    return builder.build();
}

function dictValueParserJettonTransferNotification(): DictionaryValue<JettonTransferNotification> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeJettonTransferNotification(src)).endCell());
        },
        parse: (src) => {
            return loadJettonTransferNotification(src.loadRef().beginParse());
        }
    }
}

export type TokenExcesses = {
    $$type: 'TokenExcesses';
    query_id: bigint;
}

export function storeTokenExcesses(src: TokenExcesses) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3576854235, 32);
        b_0.storeUint(src.query_id, 64);
    };
}

export function loadTokenExcesses(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3576854235) { throw Error('Invalid prefix'); }
    let _query_id = sc_0.loadUintBig(64);
    return { $$type: 'TokenExcesses' as const, query_id: _query_id };
}

function loadTupleTokenExcesses(source: TupleReader) {
    let _query_id = source.readBigNumber();
    return { $$type: 'TokenExcesses' as const, query_id: _query_id };
}

function loadGetterTupleTokenExcesses(source: TupleReader) {
    let _query_id = source.readBigNumber();
    return { $$type: 'TokenExcesses' as const, query_id: _query_id };
}

function storeTupleTokenExcesses(source: TokenExcesses) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.query_id);
    return builder.build();
}

function dictValueParserTokenExcesses(): DictionaryValue<TokenExcesses> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenExcesses(src)).endCell());
        },
        parse: (src) => {
            return loadTokenExcesses(src.loadRef().beginParse());
        }
    }
}

export type CampaignDetails = {
    $$type: 'CampaignDetails';
    regularUsersCostPerAction: Dictionary<bigint, bigint>;
    premiumUsersCostPerAction: Dictionary<bigint, bigint>;
    isPublicCampaign: boolean;
    campaignValidForNumDays: bigint | null;
    paymentMethod: bigint;
    requiresAdvertiserApprovalForWithdrawl: boolean;
}

export function storeCampaignDetails(src: CampaignDetails) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeDict(src.regularUsersCostPerAction, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        b_0.storeDict(src.premiumUsersCostPerAction, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        b_0.storeBit(src.isPublicCampaign);
        if (src.campaignValidForNumDays !== null && src.campaignValidForNumDays !== undefined) { b_0.storeBit(true).storeUint(src.campaignValidForNumDays, 32); } else { b_0.storeBit(false); }
        b_0.storeUint(src.paymentMethod, 32);
        b_0.storeBit(src.requiresAdvertiserApprovalForWithdrawl);
    };
}

export function loadCampaignDetails(slice: Slice) {
    let sc_0 = slice;
    let _regularUsersCostPerAction = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_0);
    let _premiumUsersCostPerAction = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_0);
    let _isPublicCampaign = sc_0.loadBit();
    let _campaignValidForNumDays = sc_0.loadBit() ? sc_0.loadUintBig(32) : null;
    let _paymentMethod = sc_0.loadUintBig(32);
    let _requiresAdvertiserApprovalForWithdrawl = sc_0.loadBit();
    return { $$type: 'CampaignDetails' as const, regularUsersCostPerAction: _regularUsersCostPerAction, premiumUsersCostPerAction: _premiumUsersCostPerAction, isPublicCampaign: _isPublicCampaign, campaignValidForNumDays: _campaignValidForNumDays, paymentMethod: _paymentMethod, requiresAdvertiserApprovalForWithdrawl: _requiresAdvertiserApprovalForWithdrawl };
}

function loadTupleCampaignDetails(source: TupleReader) {
    let _regularUsersCostPerAction = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _premiumUsersCostPerAction = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _isPublicCampaign = source.readBoolean();
    let _campaignValidForNumDays = source.readBigNumberOpt();
    let _paymentMethod = source.readBigNumber();
    let _requiresAdvertiserApprovalForWithdrawl = source.readBoolean();
    return { $$type: 'CampaignDetails' as const, regularUsersCostPerAction: _regularUsersCostPerAction, premiumUsersCostPerAction: _premiumUsersCostPerAction, isPublicCampaign: _isPublicCampaign, campaignValidForNumDays: _campaignValidForNumDays, paymentMethod: _paymentMethod, requiresAdvertiserApprovalForWithdrawl: _requiresAdvertiserApprovalForWithdrawl };
}

function loadGetterTupleCampaignDetails(source: TupleReader) {
    let _regularUsersCostPerAction = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _premiumUsersCostPerAction = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _isPublicCampaign = source.readBoolean();
    let _campaignValidForNumDays = source.readBigNumberOpt();
    let _paymentMethod = source.readBigNumber();
    let _requiresAdvertiserApprovalForWithdrawl = source.readBoolean();
    return { $$type: 'CampaignDetails' as const, regularUsersCostPerAction: _regularUsersCostPerAction, premiumUsersCostPerAction: _premiumUsersCostPerAction, isPublicCampaign: _isPublicCampaign, campaignValidForNumDays: _campaignValidForNumDays, paymentMethod: _paymentMethod, requiresAdvertiserApprovalForWithdrawl: _requiresAdvertiserApprovalForWithdrawl };
}

function storeTupleCampaignDetails(source: CampaignDetails) {
    let builder = new TupleBuilder();
    builder.writeCell(source.regularUsersCostPerAction.size > 0 ? beginCell().storeDictDirect(source.regularUsersCostPerAction, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.premiumUsersCostPerAction.size > 0 ? beginCell().storeDictDirect(source.premiumUsersCostPerAction, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeBoolean(source.isPublicCampaign);
    builder.writeNumber(source.campaignValidForNumDays);
    builder.writeNumber(source.paymentMethod);
    builder.writeBoolean(source.requiresAdvertiserApprovalForWithdrawl);
    return builder.build();
}

function dictValueParserCampaignDetails(): DictionaryValue<CampaignDetails> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCampaignDetails(src)).endCell());
        },
        parse: (src) => {
            return loadCampaignDetails(src.loadRef().beginParse());
        }
    }
}

export type UserActionStats = {
    $$type: 'UserActionStats';
    numActions: bigint;
    lastUserActionTimestamp: bigint;
}

export function storeUserActionStats(src: UserActionStats) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(src.numActions, 32);
        b_0.storeUint(src.lastUserActionTimestamp, 32);
    };
}

export function loadUserActionStats(slice: Slice) {
    let sc_0 = slice;
    let _numActions = sc_0.loadUintBig(32);
    let _lastUserActionTimestamp = sc_0.loadUintBig(32);
    return { $$type: 'UserActionStats' as const, numActions: _numActions, lastUserActionTimestamp: _lastUserActionTimestamp };
}

function loadTupleUserActionStats(source: TupleReader) {
    let _numActions = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    return { $$type: 'UserActionStats' as const, numActions: _numActions, lastUserActionTimestamp: _lastUserActionTimestamp };
}

function loadGetterTupleUserActionStats(source: TupleReader) {
    let _numActions = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    return { $$type: 'UserActionStats' as const, numActions: _numActions, lastUserActionTimestamp: _lastUserActionTimestamp };
}

function storeTupleUserActionStats(source: UserActionStats) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.numActions);
    builder.writeNumber(source.lastUserActionTimestamp);
    return builder.build();
}

function dictValueParserUserActionStats(): DictionaryValue<UserActionStats> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUserActionStats(src)).endCell());
        },
        parse: (src) => {
            return loadUserActionStats(src.loadRef().beginParse());
        }
    }
}

export type AffiliateData = {
    $$type: 'AffiliateData';
    affiliate: Address;
    state: bigint;
    userActionsStats: Dictionary<bigint, UserActionStats>;
    premiumUserActionsStats: Dictionary<bigint, UserActionStats>;
    pendingApprovalEarnings: bigint;
    totalEarnings: bigint;
    withdrawEarnings: bigint;
}

export function storeAffiliateData(src: AffiliateData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.affiliate);
        b_0.storeUint(src.state, 8);
        b_0.storeDict(src.userActionsStats, Dictionary.Keys.BigInt(257), dictValueParserUserActionStats());
        b_0.storeDict(src.premiumUserActionsStats, Dictionary.Keys.BigInt(257), dictValueParserUserActionStats());
        b_0.storeCoins(src.pendingApprovalEarnings);
        b_0.storeCoins(src.totalEarnings);
        b_0.storeCoins(src.withdrawEarnings);
    };
}

export function loadAffiliateData(slice: Slice) {
    let sc_0 = slice;
    let _affiliate = sc_0.loadAddress();
    let _state = sc_0.loadUintBig(8);
    let _userActionsStats = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), sc_0);
    let _premiumUserActionsStats = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), sc_0);
    let _pendingApprovalEarnings = sc_0.loadCoins();
    let _totalEarnings = sc_0.loadCoins();
    let _withdrawEarnings = sc_0.loadCoins();
    return { $$type: 'AffiliateData' as const, affiliate: _affiliate, state: _state, userActionsStats: _userActionsStats, premiumUserActionsStats: _premiumUserActionsStats, pendingApprovalEarnings: _pendingApprovalEarnings, totalEarnings: _totalEarnings, withdrawEarnings: _withdrawEarnings };
}

function loadTupleAffiliateData(source: TupleReader) {
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    let _userActionsStats = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), source.readCellOpt());
    let _premiumUserActionsStats = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), source.readCellOpt());
    let _pendingApprovalEarnings = source.readBigNumber();
    let _totalEarnings = source.readBigNumber();
    let _withdrawEarnings = source.readBigNumber();
    return { $$type: 'AffiliateData' as const, affiliate: _affiliate, state: _state, userActionsStats: _userActionsStats, premiumUserActionsStats: _premiumUserActionsStats, pendingApprovalEarnings: _pendingApprovalEarnings, totalEarnings: _totalEarnings, withdrawEarnings: _withdrawEarnings };
}

function loadGetterTupleAffiliateData(source: TupleReader) {
    let _affiliate = source.readAddress();
    let _state = source.readBigNumber();
    let _userActionsStats = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), source.readCellOpt());
    let _premiumUserActionsStats = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserUserActionStats(), source.readCellOpt());
    let _pendingApprovalEarnings = source.readBigNumber();
    let _totalEarnings = source.readBigNumber();
    let _withdrawEarnings = source.readBigNumber();
    return { $$type: 'AffiliateData' as const, affiliate: _affiliate, state: _state, userActionsStats: _userActionsStats, premiumUserActionsStats: _premiumUserActionsStats, pendingApprovalEarnings: _pendingApprovalEarnings, totalEarnings: _totalEarnings, withdrawEarnings: _withdrawEarnings };
}

function storeTupleAffiliateData(source: AffiliateData) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.affiliate);
    builder.writeNumber(source.state);
    builder.writeCell(source.userActionsStats.size > 0 ? beginCell().storeDictDirect(source.userActionsStats, Dictionary.Keys.BigInt(257), dictValueParserUserActionStats()).endCell() : null);
    builder.writeCell(source.premiumUserActionsStats.size > 0 ? beginCell().storeDictDirect(source.premiumUserActionsStats, Dictionary.Keys.BigInt(257), dictValueParserUserActionStats()).endCell() : null);
    builder.writeNumber(source.pendingApprovalEarnings);
    builder.writeNumber(source.totalEarnings);
    builder.writeNumber(source.withdrawEarnings);
    return builder.build();
}

function dictValueParserAffiliateData(): DictionaryValue<AffiliateData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAffiliateData(src)).endCell());
        },
        parse: (src) => {
            return loadAffiliateData(src.loadRef().beginParse());
        }
    }
}

export type CampaignData = {
    $$type: 'CampaignData';
    campaignId: bigint;
    advertiser: Address;
    owner: Address;
    payout: Address;
    campaignDetails: CampaignDetails;
    numAffiliates: bigint;
    totalAffiliateEarnings: bigint;
    state: bigint;
    campaignStartTimestamp: bigint;
    lastUserActionTimestamp: bigint;
    numAdvertiserWithdrawls: bigint;
    numAdvertiserSignOffs: bigint;
    numAdvertiserReplenishCampaign: bigint;
    numAdvertiserReplenishGasFees: bigint;
    numUserActions: bigint;
    campaignBalance: bigint;
    maxCpaValue: bigint;
    contractTonBalance: bigint;
    contractAddress: Address;
    contractUSDTBalance: bigint;
    contractUsdtWallet: Address;
    advertiserFeePercentage: bigint;
    affiliateFeePercentage: bigint;
    campaignHasSufficientFundsToPayMaxCpa: boolean;
    isCampaignExpired: boolean;
    isCampaignPausedByAdmin: boolean;
    campaignHasSufficientTonToPayGasFees: boolean;
    isCampaignActive: boolean;
    topAffiliates: Dictionary<bigint, bigint>;
}

export function storeCampaignData(src: CampaignData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.payout);
        b_0.store(storeCampaignDetails(src.campaignDetails));
        b_0.storeUint(src.numAffiliates, 32);
        let b_1 = new Builder();
        b_1.storeCoins(src.totalAffiliateEarnings);
        b_1.storeUint(src.state, 32);
        b_1.storeUint(src.campaignStartTimestamp, 32);
        b_1.storeUint(src.lastUserActionTimestamp, 32);
        b_1.storeUint(src.numAdvertiserWithdrawls, 32);
        b_1.storeUint(src.numAdvertiserSignOffs, 32);
        b_1.storeUint(src.numAdvertiserReplenishCampaign, 32);
        b_1.storeUint(src.numAdvertiserReplenishGasFees, 32);
        b_1.storeUint(src.numUserActions, 32);
        b_1.storeCoins(src.campaignBalance);
        b_1.storeCoins(src.maxCpaValue);
        b_1.storeCoins(src.contractTonBalance);
        b_1.storeAddress(src.contractAddress);
        let b_2 = new Builder();
        b_2.storeCoins(src.contractUSDTBalance);
        b_2.storeAddress(src.contractUsdtWallet);
        b_2.storeUint(src.advertiserFeePercentage, 32);
        b_2.storeUint(src.affiliateFeePercentage, 32);
        b_2.storeBit(src.campaignHasSufficientFundsToPayMaxCpa);
        b_2.storeBit(src.isCampaignExpired);
        b_2.storeBit(src.isCampaignPausedByAdmin);
        b_2.storeBit(src.campaignHasSufficientTonToPayGasFees);
        b_2.storeBit(src.isCampaignActive);
        b_2.storeDict(src.topAffiliates, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCampaignData(slice: Slice) {
    let sc_0 = slice;
    let _campaignId = sc_0.loadUintBig(32);
    let _advertiser = sc_0.loadAddress();
    let _owner = sc_0.loadAddress();
    let _payout = sc_0.loadAddress();
    let _campaignDetails = loadCampaignDetails(sc_0);
    let _numAffiliates = sc_0.loadUintBig(32);
    let sc_1 = sc_0.loadRef().beginParse();
    let _totalAffiliateEarnings = sc_1.loadCoins();
    let _state = sc_1.loadUintBig(32);
    let _campaignStartTimestamp = sc_1.loadUintBig(32);
    let _lastUserActionTimestamp = sc_1.loadUintBig(32);
    let _numAdvertiserWithdrawls = sc_1.loadUintBig(32);
    let _numAdvertiserSignOffs = sc_1.loadUintBig(32);
    let _numAdvertiserReplenishCampaign = sc_1.loadUintBig(32);
    let _numAdvertiserReplenishGasFees = sc_1.loadUintBig(32);
    let _numUserActions = sc_1.loadUintBig(32);
    let _campaignBalance = sc_1.loadCoins();
    let _maxCpaValue = sc_1.loadCoins();
    let _contractTonBalance = sc_1.loadCoins();
    let _contractAddress = sc_1.loadAddress();
    let sc_2 = sc_1.loadRef().beginParse();
    let _contractUSDTBalance = sc_2.loadCoins();
    let _contractUsdtWallet = sc_2.loadAddress();
    let _advertiserFeePercentage = sc_2.loadUintBig(32);
    let _affiliateFeePercentage = sc_2.loadUintBig(32);
    let _campaignHasSufficientFundsToPayMaxCpa = sc_2.loadBit();
    let _isCampaignExpired = sc_2.loadBit();
    let _isCampaignPausedByAdmin = sc_2.loadBit();
    let _campaignHasSufficientTonToPayGasFees = sc_2.loadBit();
    let _isCampaignActive = sc_2.loadBit();
    let _topAffiliates = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_2);
    return { $$type: 'CampaignData' as const, campaignId: _campaignId, advertiser: _advertiser, owner: _owner, payout: _payout, campaignDetails: _campaignDetails, numAffiliates: _numAffiliates, totalAffiliateEarnings: _totalAffiliateEarnings, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, campaignBalance: _campaignBalance, maxCpaValue: _maxCpaValue, contractTonBalance: _contractTonBalance, contractAddress: _contractAddress, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage, campaignHasSufficientFundsToPayMaxCpa: _campaignHasSufficientFundsToPayMaxCpa, isCampaignExpired: _isCampaignExpired, isCampaignPausedByAdmin: _isCampaignPausedByAdmin, campaignHasSufficientTonToPayGasFees: _campaignHasSufficientTonToPayGasFees, isCampaignActive: _isCampaignActive, topAffiliates: _topAffiliates };
}

function loadTupleCampaignData(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _owner = source.readAddress();
    let _payout = source.readAddress();
    const _campaignDetails = loadTupleCampaignDetails(source);
    let _numAffiliates = source.readBigNumber();
    let _totalAffiliateEarnings = source.readBigNumber();
    let _state = source.readBigNumber();
    let _campaignStartTimestamp = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    let _numAdvertiserWithdrawls = source.readBigNumber();
    let _numAdvertiserSignOffs = source.readBigNumber();
    let _numAdvertiserReplenishCampaign = source.readBigNumber();
    let _numAdvertiserReplenishGasFees = source.readBigNumber();
    source = source.readTuple();
    let _numUserActions = source.readBigNumber();
    let _campaignBalance = source.readBigNumber();
    let _maxCpaValue = source.readBigNumber();
    let _contractTonBalance = source.readBigNumber();
    let _contractAddress = source.readAddress();
    let _contractUSDTBalance = source.readBigNumber();
    let _contractUsdtWallet = source.readAddress();
    let _advertiserFeePercentage = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    let _campaignHasSufficientFundsToPayMaxCpa = source.readBoolean();
    let _isCampaignExpired = source.readBoolean();
    let _isCampaignPausedByAdmin = source.readBoolean();
    let _campaignHasSufficientTonToPayGasFees = source.readBoolean();
    let _isCampaignActive = source.readBoolean();
    source = source.readTuple();
    let _topAffiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    return { $$type: 'CampaignData' as const, campaignId: _campaignId, advertiser: _advertiser, owner: _owner, payout: _payout, campaignDetails: _campaignDetails, numAffiliates: _numAffiliates, totalAffiliateEarnings: _totalAffiliateEarnings, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, campaignBalance: _campaignBalance, maxCpaValue: _maxCpaValue, contractTonBalance: _contractTonBalance, contractAddress: _contractAddress, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage, campaignHasSufficientFundsToPayMaxCpa: _campaignHasSufficientFundsToPayMaxCpa, isCampaignExpired: _isCampaignExpired, isCampaignPausedByAdmin: _isCampaignPausedByAdmin, campaignHasSufficientTonToPayGasFees: _campaignHasSufficientTonToPayGasFees, isCampaignActive: _isCampaignActive, topAffiliates: _topAffiliates };
}

function loadGetterTupleCampaignData(source: TupleReader) {
    let _campaignId = source.readBigNumber();
    let _advertiser = source.readAddress();
    let _owner = source.readAddress();
    let _payout = source.readAddress();
    const _campaignDetails = loadGetterTupleCampaignDetails(source);
    let _numAffiliates = source.readBigNumber();
    let _totalAffiliateEarnings = source.readBigNumber();
    let _state = source.readBigNumber();
    let _campaignStartTimestamp = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    let _numAdvertiserWithdrawls = source.readBigNumber();
    let _numAdvertiserSignOffs = source.readBigNumber();
    let _numAdvertiserReplenishCampaign = source.readBigNumber();
    let _numAdvertiserReplenishGasFees = source.readBigNumber();
    let _numUserActions = source.readBigNumber();
    let _campaignBalance = source.readBigNumber();
    let _maxCpaValue = source.readBigNumber();
    let _contractTonBalance = source.readBigNumber();
    let _contractAddress = source.readAddress();
    let _contractUSDTBalance = source.readBigNumber();
    let _contractUsdtWallet = source.readAddress();
    let _advertiserFeePercentage = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    let _campaignHasSufficientFundsToPayMaxCpa = source.readBoolean();
    let _isCampaignExpired = source.readBoolean();
    let _isCampaignPausedByAdmin = source.readBoolean();
    let _campaignHasSufficientTonToPayGasFees = source.readBoolean();
    let _isCampaignActive = source.readBoolean();
    let _topAffiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    return { $$type: 'CampaignData' as const, campaignId: _campaignId, advertiser: _advertiser, owner: _owner, payout: _payout, campaignDetails: _campaignDetails, numAffiliates: _numAffiliates, totalAffiliateEarnings: _totalAffiliateEarnings, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, campaignBalance: _campaignBalance, maxCpaValue: _maxCpaValue, contractTonBalance: _contractTonBalance, contractAddress: _contractAddress, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet, advertiserFeePercentage: _advertiserFeePercentage, affiliateFeePercentage: _affiliateFeePercentage, campaignHasSufficientFundsToPayMaxCpa: _campaignHasSufficientFundsToPayMaxCpa, isCampaignExpired: _isCampaignExpired, isCampaignPausedByAdmin: _isCampaignPausedByAdmin, campaignHasSufficientTonToPayGasFees: _campaignHasSufficientTonToPayGasFees, isCampaignActive: _isCampaignActive, topAffiliates: _topAffiliates };
}

function storeTupleCampaignData(source: CampaignData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.advertiser);
    builder.writeAddress(source.owner);
    builder.writeAddress(source.payout);
    builder.writeTuple(storeTupleCampaignDetails(source.campaignDetails));
    builder.writeNumber(source.numAffiliates);
    builder.writeNumber(source.totalAffiliateEarnings);
    builder.writeNumber(source.state);
    builder.writeNumber(source.campaignStartTimestamp);
    builder.writeNumber(source.lastUserActionTimestamp);
    builder.writeNumber(source.numAdvertiserWithdrawls);
    builder.writeNumber(source.numAdvertiserSignOffs);
    builder.writeNumber(source.numAdvertiserReplenishCampaign);
    builder.writeNumber(source.numAdvertiserReplenishGasFees);
    builder.writeNumber(source.numUserActions);
    builder.writeNumber(source.campaignBalance);
    builder.writeNumber(source.maxCpaValue);
    builder.writeNumber(source.contractTonBalance);
    builder.writeAddress(source.contractAddress);
    builder.writeNumber(source.contractUSDTBalance);
    builder.writeAddress(source.contractUsdtWallet);
    builder.writeNumber(source.advertiserFeePercentage);
    builder.writeNumber(source.affiliateFeePercentage);
    builder.writeBoolean(source.campaignHasSufficientFundsToPayMaxCpa);
    builder.writeBoolean(source.isCampaignExpired);
    builder.writeBoolean(source.isCampaignPausedByAdmin);
    builder.writeBoolean(source.campaignHasSufficientTonToPayGasFees);
    builder.writeBoolean(source.isCampaignActive);
    builder.writeCell(source.topAffiliates.size > 0 ? beginCell().storeDictDirect(source.topAffiliates, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    return builder.build();
}

function dictValueParserCampaignData(): DictionaryValue<CampaignData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCampaignData(src)).endCell());
        },
        parse: (src) => {
            return loadCampaignData(src.loadRef().beginParse());
        }
    }
}

export type JettonWalletData = {
    $$type: 'JettonWalletData';
    status: bigint;
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
}

export function storeJettonWalletData(src: JettonWalletData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(src.status, 4);
        b_0.storeCoins(src.balance);
        b_0.storeAddress(src.ownerAddress);
        b_0.storeAddress(src.jettonMasterAddress);
    };
}

export function loadJettonWalletData(slice: Slice) {
    let sc_0 = slice;
    let _status = sc_0.loadUintBig(4);
    let _balance = sc_0.loadCoins();
    let _ownerAddress = sc_0.loadAddress();
    let _jettonMasterAddress = sc_0.loadAddress();
    return { $$type: 'JettonWalletData' as const, status: _status, balance: _balance, ownerAddress: _ownerAddress, jettonMasterAddress: _jettonMasterAddress };
}

function loadTupleJettonWalletData(source: TupleReader) {
    let _status = source.readBigNumber();
    let _balance = source.readBigNumber();
    let _ownerAddress = source.readAddress();
    let _jettonMasterAddress = source.readAddress();
    return { $$type: 'JettonWalletData' as const, status: _status, balance: _balance, ownerAddress: _ownerAddress, jettonMasterAddress: _jettonMasterAddress };
}

function loadGetterTupleJettonWalletData(source: TupleReader) {
    let _status = source.readBigNumber();
    let _balance = source.readBigNumber();
    let _ownerAddress = source.readAddress();
    let _jettonMasterAddress = source.readAddress();
    return { $$type: 'JettonWalletData' as const, status: _status, balance: _balance, ownerAddress: _ownerAddress, jettonMasterAddress: _jettonMasterAddress };
}

function storeTupleJettonWalletData(source: JettonWalletData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.status);
    builder.writeNumber(source.balance);
    builder.writeAddress(source.ownerAddress);
    builder.writeAddress(source.jettonMasterAddress);
    return builder.build();
}

function dictValueParserJettonWalletData(): DictionaryValue<JettonWalletData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeJettonWalletData(src)).endCell());
        },
        parse: (src) => {
            return loadJettonWalletData(src.loadRef().beginParse());
        }
    }
}

export type Campaign$Data = {
    $$type: 'Campaign$Data';
    owner: Address;
    stopped: boolean;
    campaignId: bigint;
    payout: Address;
    advertiser: Address;
    campaignDetails: CampaignDetails;
    bot: Address;
    currAffiliateId: bigint;
    affiliates: Dictionary<bigint, AffiliateData>;
    state: bigint;
    campaignStartTimestamp: bigint;
    lastUserActionTimestamp: bigint;
    numAdvertiserWithdrawls: bigint;
    numAdvertiserSignOffs: bigint;
    numAdvertiserReplenishCampaign: bigint;
    numAdvertiserReplenishGasFees: bigint;
    numUserActions: bigint;
    totalAffiliateEarnings: bigint;
    maxCpaValue: bigint;
    affiliateFeePercentage: bigint;
    advertiserFeePercentage: bigint;
    topAffiliates: Dictionary<bigint, bigint>;
    contractUSDTBalance: bigint;
    contractUsdtWallet: Address;
}

export function storeCampaign$Data(src: Campaign$Data) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeBit(src.stopped);
        b_0.storeUint(src.campaignId, 32);
        b_0.storeAddress(src.payout);
        b_0.storeAddress(src.advertiser);
        b_0.store(storeCampaignDetails(src.campaignDetails));
        let b_1 = new Builder();
        b_1.storeAddress(src.bot);
        b_1.storeUint(src.currAffiliateId, 32);
        b_1.storeDict(src.affiliates, Dictionary.Keys.BigInt(257), dictValueParserAffiliateData());
        b_1.storeUint(src.state, 32);
        b_1.storeUint(src.campaignStartTimestamp, 32);
        b_1.storeUint(src.lastUserActionTimestamp, 32);
        b_1.storeUint(src.numAdvertiserWithdrawls, 32);
        b_1.storeUint(src.numAdvertiserSignOffs, 32);
        b_1.storeUint(src.numAdvertiserReplenishCampaign, 32);
        b_1.storeUint(src.numAdvertiserReplenishGasFees, 32);
        b_1.storeUint(src.numUserActions, 32);
        b_1.storeCoins(src.totalAffiliateEarnings);
        b_1.storeCoins(src.maxCpaValue);
        b_1.storeUint(src.affiliateFeePercentage, 32);
        b_1.storeUint(src.advertiserFeePercentage, 32);
        b_1.storeDict(src.topAffiliates, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        b_1.storeCoins(src.contractUSDTBalance);
        let b_2 = new Builder();
        b_2.storeAddress(src.contractUsdtWallet);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCampaign$Data(slice: Slice) {
    let sc_0 = slice;
    let _owner = sc_0.loadAddress();
    let _stopped = sc_0.loadBit();
    let _campaignId = sc_0.loadUintBig(32);
    let _payout = sc_0.loadAddress();
    let _advertiser = sc_0.loadAddress();
    let _campaignDetails = loadCampaignDetails(sc_0);
    let sc_1 = sc_0.loadRef().beginParse();
    let _bot = sc_1.loadAddress();
    let _currAffiliateId = sc_1.loadUintBig(32);
    let _affiliates = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserAffiliateData(), sc_1);
    let _state = sc_1.loadUintBig(32);
    let _campaignStartTimestamp = sc_1.loadUintBig(32);
    let _lastUserActionTimestamp = sc_1.loadUintBig(32);
    let _numAdvertiserWithdrawls = sc_1.loadUintBig(32);
    let _numAdvertiserSignOffs = sc_1.loadUintBig(32);
    let _numAdvertiserReplenishCampaign = sc_1.loadUintBig(32);
    let _numAdvertiserReplenishGasFees = sc_1.loadUintBig(32);
    let _numUserActions = sc_1.loadUintBig(32);
    let _totalAffiliateEarnings = sc_1.loadCoins();
    let _maxCpaValue = sc_1.loadCoins();
    let _affiliateFeePercentage = sc_1.loadUintBig(32);
    let _advertiserFeePercentage = sc_1.loadUintBig(32);
    let _topAffiliates = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_1);
    let _contractUSDTBalance = sc_1.loadCoins();
    let sc_2 = sc_1.loadRef().beginParse();
    let _contractUsdtWallet = sc_2.loadAddress();
    return { $$type: 'Campaign$Data' as const, owner: _owner, stopped: _stopped, campaignId: _campaignId, payout: _payout, advertiser: _advertiser, campaignDetails: _campaignDetails, bot: _bot, currAffiliateId: _currAffiliateId, affiliates: _affiliates, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, totalAffiliateEarnings: _totalAffiliateEarnings, maxCpaValue: _maxCpaValue, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage, topAffiliates: _topAffiliates, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet };
}

function loadTupleCampaign$Data(source: TupleReader) {
    let _owner = source.readAddress();
    let _stopped = source.readBoolean();
    let _campaignId = source.readBigNumber();
    let _payout = source.readAddress();
    let _advertiser = source.readAddress();
    const _campaignDetails = loadTupleCampaignDetails(source);
    let _bot = source.readAddress();
    let _currAffiliateId = source.readBigNumber();
    let _affiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserAffiliateData(), source.readCellOpt());
    let _state = source.readBigNumber();
    let _campaignStartTimestamp = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    let _numAdvertiserWithdrawls = source.readBigNumber();
    let _numAdvertiserSignOffs = source.readBigNumber();
    source = source.readTuple();
    let _numAdvertiserReplenishCampaign = source.readBigNumber();
    let _numAdvertiserReplenishGasFees = source.readBigNumber();
    let _numUserActions = source.readBigNumber();
    let _totalAffiliateEarnings = source.readBigNumber();
    let _maxCpaValue = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    let _advertiserFeePercentage = source.readBigNumber();
    let _topAffiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _contractUSDTBalance = source.readBigNumber();
    let _contractUsdtWallet = source.readAddress();
    return { $$type: 'Campaign$Data' as const, owner: _owner, stopped: _stopped, campaignId: _campaignId, payout: _payout, advertiser: _advertiser, campaignDetails: _campaignDetails, bot: _bot, currAffiliateId: _currAffiliateId, affiliates: _affiliates, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, totalAffiliateEarnings: _totalAffiliateEarnings, maxCpaValue: _maxCpaValue, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage, topAffiliates: _topAffiliates, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet };
}

function loadGetterTupleCampaign$Data(source: TupleReader) {
    let _owner = source.readAddress();
    let _stopped = source.readBoolean();
    let _campaignId = source.readBigNumber();
    let _payout = source.readAddress();
    let _advertiser = source.readAddress();
    const _campaignDetails = loadGetterTupleCampaignDetails(source);
    let _bot = source.readAddress();
    let _currAffiliateId = source.readBigNumber();
    let _affiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserAffiliateData(), source.readCellOpt());
    let _state = source.readBigNumber();
    let _campaignStartTimestamp = source.readBigNumber();
    let _lastUserActionTimestamp = source.readBigNumber();
    let _numAdvertiserWithdrawls = source.readBigNumber();
    let _numAdvertiserSignOffs = source.readBigNumber();
    let _numAdvertiserReplenishCampaign = source.readBigNumber();
    let _numAdvertiserReplenishGasFees = source.readBigNumber();
    let _numUserActions = source.readBigNumber();
    let _totalAffiliateEarnings = source.readBigNumber();
    let _maxCpaValue = source.readBigNumber();
    let _affiliateFeePercentage = source.readBigNumber();
    let _advertiserFeePercentage = source.readBigNumber();
    let _topAffiliates = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    let _contractUSDTBalance = source.readBigNumber();
    let _contractUsdtWallet = source.readAddress();
    return { $$type: 'Campaign$Data' as const, owner: _owner, stopped: _stopped, campaignId: _campaignId, payout: _payout, advertiser: _advertiser, campaignDetails: _campaignDetails, bot: _bot, currAffiliateId: _currAffiliateId, affiliates: _affiliates, state: _state, campaignStartTimestamp: _campaignStartTimestamp, lastUserActionTimestamp: _lastUserActionTimestamp, numAdvertiserWithdrawls: _numAdvertiserWithdrawls, numAdvertiserSignOffs: _numAdvertiserSignOffs, numAdvertiserReplenishCampaign: _numAdvertiserReplenishCampaign, numAdvertiserReplenishGasFees: _numAdvertiserReplenishGasFees, numUserActions: _numUserActions, totalAffiliateEarnings: _totalAffiliateEarnings, maxCpaValue: _maxCpaValue, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage, topAffiliates: _topAffiliates, contractUSDTBalance: _contractUSDTBalance, contractUsdtWallet: _contractUsdtWallet };
}

function storeTupleCampaign$Data(source: Campaign$Data) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeBoolean(source.stopped);
    builder.writeNumber(source.campaignId);
    builder.writeAddress(source.payout);
    builder.writeAddress(source.advertiser);
    builder.writeTuple(storeTupleCampaignDetails(source.campaignDetails));
    builder.writeAddress(source.bot);
    builder.writeNumber(source.currAffiliateId);
    builder.writeCell(source.affiliates.size > 0 ? beginCell().storeDictDirect(source.affiliates, Dictionary.Keys.BigInt(257), dictValueParserAffiliateData()).endCell() : null);
    builder.writeNumber(source.state);
    builder.writeNumber(source.campaignStartTimestamp);
    builder.writeNumber(source.lastUserActionTimestamp);
    builder.writeNumber(source.numAdvertiserWithdrawls);
    builder.writeNumber(source.numAdvertiserSignOffs);
    builder.writeNumber(source.numAdvertiserReplenishCampaign);
    builder.writeNumber(source.numAdvertiserReplenishGasFees);
    builder.writeNumber(source.numUserActions);
    builder.writeNumber(source.totalAffiliateEarnings);
    builder.writeNumber(source.maxCpaValue);
    builder.writeNumber(source.affiliateFeePercentage);
    builder.writeNumber(source.advertiserFeePercentage);
    builder.writeCell(source.topAffiliates.size > 0 ? beginCell().storeDictDirect(source.topAffiliates, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeNumber(source.contractUSDTBalance);
    builder.writeAddress(source.contractUsdtWallet);
    return builder.build();
}

function dictValueParserCampaign$Data(): DictionaryValue<Campaign$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCampaign$Data(src)).endCell());
        },
        parse: (src) => {
            return loadCampaign$Data(src.loadRef().beginParse());
        }
    }
}

export type AffiliateMarketplace$Data = {
    $$type: 'AffiliateMarketplace$Data';
    owner: Address;
    stopped: boolean;
    bot: Address;
    numCampaigns: bigint;
    usdtMasterAddress: Address;
    usdtWalletBytecode: Cell;
    affiliateFeePercentage: bigint;
    advertiserFeePercentage: bigint;
}

export function storeAffiliateMarketplace$Data(src: AffiliateMarketplace$Data) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeBit(src.stopped);
        b_0.storeAddress(src.bot);
        b_0.storeUint(src.numCampaigns, 32);
        b_0.storeAddress(src.usdtMasterAddress);
        b_0.storeRef(src.usdtWalletBytecode);
        b_0.storeUint(src.affiliateFeePercentage, 32);
        b_0.storeUint(src.advertiserFeePercentage, 32);
    };
}

export function loadAffiliateMarketplace$Data(slice: Slice) {
    let sc_0 = slice;
    let _owner = sc_0.loadAddress();
    let _stopped = sc_0.loadBit();
    let _bot = sc_0.loadAddress();
    let _numCampaigns = sc_0.loadUintBig(32);
    let _usdtMasterAddress = sc_0.loadAddress();
    let _usdtWalletBytecode = sc_0.loadRef();
    let _affiliateFeePercentage = sc_0.loadUintBig(32);
    let _advertiserFeePercentage = sc_0.loadUintBig(32);
    return { $$type: 'AffiliateMarketplace$Data' as const, owner: _owner, stopped: _stopped, bot: _bot, numCampaigns: _numCampaigns, usdtMasterAddress: _usdtMasterAddress, usdtWalletBytecode: _usdtWalletBytecode, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage };
}

function loadTupleAffiliateMarketplace$Data(source: TupleReader) {
    let _owner = source.readAddress();
    let _stopped = source.readBoolean();
    let _bot = source.readAddress();
    let _numCampaigns = source.readBigNumber();
    let _usdtMasterAddress = source.readAddress();
    let _usdtWalletBytecode = source.readCell();
    let _affiliateFeePercentage = source.readBigNumber();
    let _advertiserFeePercentage = source.readBigNumber();
    return { $$type: 'AffiliateMarketplace$Data' as const, owner: _owner, stopped: _stopped, bot: _bot, numCampaigns: _numCampaigns, usdtMasterAddress: _usdtMasterAddress, usdtWalletBytecode: _usdtWalletBytecode, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage };
}

function loadGetterTupleAffiliateMarketplace$Data(source: TupleReader) {
    let _owner = source.readAddress();
    let _stopped = source.readBoolean();
    let _bot = source.readAddress();
    let _numCampaigns = source.readBigNumber();
    let _usdtMasterAddress = source.readAddress();
    let _usdtWalletBytecode = source.readCell();
    let _affiliateFeePercentage = source.readBigNumber();
    let _advertiserFeePercentage = source.readBigNumber();
    return { $$type: 'AffiliateMarketplace$Data' as const, owner: _owner, stopped: _stopped, bot: _bot, numCampaigns: _numCampaigns, usdtMasterAddress: _usdtMasterAddress, usdtWalletBytecode: _usdtWalletBytecode, affiliateFeePercentage: _affiliateFeePercentage, advertiserFeePercentage: _advertiserFeePercentage };
}

function storeTupleAffiliateMarketplace$Data(source: AffiliateMarketplace$Data) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeBoolean(source.stopped);
    builder.writeAddress(source.bot);
    builder.writeNumber(source.numCampaigns);
    builder.writeAddress(source.usdtMasterAddress);
    builder.writeCell(source.usdtWalletBytecode);
    builder.writeNumber(source.affiliateFeePercentage);
    builder.writeNumber(source.advertiserFeePercentage);
    return builder.build();
}

function dictValueParserAffiliateMarketplace$Data(): DictionaryValue<AffiliateMarketplace$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAffiliateMarketplace$Data(src)).endCell());
        },
        parse: (src) => {
            return loadAffiliateMarketplace$Data(src.loadRef().beginParse());
        }
    }
}

 type Campaign_init_args = {
    $$type: 'Campaign_init_args';
    owner: Address;
    campaignId: bigint;
    advertiser: Address;
    payout: Address;
    bot: Address;
    usdtMasterAddress: Address;
    usdtWalletBytecode: Cell;
    advertiserFeePercentage: bigint;
    affiliateFeePercentage: bigint;
}

function initCampaign_init_args(src: Campaign_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeInt(src.campaignId, 257);
        b_0.storeAddress(src.advertiser);
        let b_1 = new Builder();
        b_1.storeAddress(src.payout);
        b_1.storeAddress(src.bot);
        b_1.storeAddress(src.usdtMasterAddress);
        b_1.storeRef(src.usdtWalletBytecode);
        let b_2 = new Builder();
        b_2.storeInt(src.advertiserFeePercentage, 257);
        b_2.storeInt(src.affiliateFeePercentage, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

async function Campaign_init(owner: Address, campaignId: bigint, advertiser: Address, payout: Address, bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell, advertiserFeePercentage: bigint, affiliateFeePercentage: bigint) {
    const __code = Cell.fromBase64('te6ccgECkgEAK/UAART/APSkE/S88sgLAQIBYgIDAvDQAdDTAwFxsKMB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFRQUwNvBPhhAvhi2zwRHBEeERwRGxEdERsRGhEcERoRGREbERkRGBEaERgRFxEZERcRFhEYERYRFREXERURFBEWERQRExEVERMREhEUERKHBAIBIGJjApIRERETEREREBESERAPEREPDhEQDhDfVRzbPPLggsj4QwHMfwHKABEdERwRGxEaERkRGBEXERYRFREUERMREhERERBV4Ns8ye1UBQYEyu2i7fsBjrSAINchcCHXScIflTAg1wsf3oIQibnSwrqOl9MfAYIQibnSwrry4IHTH/oAWWwS2zx/4DB/4HAh10nCH5UwINcLH94gghBNCkDcuuMCIIIQ1TJ227rjAiCCEHNi0Jy6VwcICQHwAREdAREcINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WAREaAcoAAREYAcsfAREWINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WAREUINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyAYFERMFHgHkMNMfAYIQTQpA3Lry4IHTH/pAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgSbBLIWYIQFhk1dFADyx/LHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BggiYloBxfwQDbW3bPDB/YABSMNMfAYIQ1TJ227ry4IHTPwExMIIA5pv4QlIgxwXy9IEI4FYUwAHy9H8C/o77MNMfAYIQc2LQnLry4IHTP/oA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFQTAxAjbBQwMoIA5pv4QlJAxwXy9FYaggCfMwPHBRLy9IFmXVYVwAHy9AqkCoED6KhTBKiBJw+ggScQqQRmoSHCAJEx4w0SoAF/4CAKCwL4ER0RHhEdERwRHhEcERsRHhEbVh4RGxEaERkRGBEXERYRFREUERMREhERERAPDg0MCwoJCAcGBQRDEwERHwHbPBEcER0RHBEbERwRGxEaERsRGhEZERoRGREYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRE1EMBKKCEImnHea6jpUw0x8BghCJpx3muvLggdMfATHbPH/gIIIQky+AULqOlTDTHwGCEJMvgFC68uCB9AQBMds8f+AgghAUTRNruuMCIIIQSrCbSLoNDg8QADAREhETERIRERESEREREBERERAPERAPVQ4C9hEcER0RHBEbER0RGxEaER0RGhEZER0RGREYER0RGBEXER0RFxEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zyCAK/k+EFvJFwhAvIRHBEdERwRGxEdERsRGhEdERoRGREdERkRGBEdERgRFxEdERcRFhEdERYRFREdERURFBEdERQRExEdERMREhEdERIREREdEREREBEdERAPER0PDhEdDg0RHQ0MER0MCxEdCwoRHQoJER0JER0IBwZVQNs8ERsRHBEbXBEDWjDTHwGCEBRNE2u68uCBbTEw2zwhwgCOhVYZIts83lYZcIMGf1UgbW1t2zwwf1tRYAT8jxUw0x8BghBKsJtIuvLggds8bBbbPH/gIIIQTqRAtrqO0zDTHwGCEE6kQLa68uCBbTEwgTKpL8AB8vSCAM/V+EJWGgHHBfL0CaT4QW8kE18DUwSoMYEnD6CBJxCpBCDCAI6NVhoBf3NDMG1tbds8MJEw4gl/4CCCELz2hwq6jBZgFwL6ERoRHBEaERkRHBEZERgRHBEYERcRHBEXERYRHBEWERURHBEVERQRHBEUERMRHBETERIRHBESERERHBERERARHBEQDxEcDw4RHA4NERwNDBEcDAsRHAsKERwKCREcCREcCAcGVUCBXk4RHds8AREeAfL0gW+qVhLy9C6BAQF/EgP+9IVvpSCREpUxbTJtAeKQiuhbVx0IpFYWcIBAf1UgbW1t2zwwERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q3xDOEL0QrBCbChB5EGgQVxNgFAP+IG6SMG2Oh9DbPGwXbwfiIG7y0IBvJ4EBASBWJ1Qio0Ez9AxvoZQB1wAwkltt4iBus44bIG7y0ICBI6VTFLvy9FIwoVEzoVEjoVDjoVAtkTDiWKAVFEMwcFAGgQEBB8hVYNs8yQIREQJWEQEgbpUwWfRaMJRBM/QV4oEBASEREXJrFQAMEEYQNUQDACRZ9HhvpSCUAtQwWJUxbTJtAeID9IIA4N/4QlYgAccF8vSCAN/hVhXAAPL0gRQQIsAAkX+TIsAB4vL0ggD5yCNukX+YIyBu8tCAwgDi8vSBAQFUVgBZ9IRvpSCWUCPXADBYlmwhbTJtAeKQiuhbgQEBVFUAWfSEb6UgllAj1wAwWJZsIW0ybQHikIroW1cTGBkaBP6ONDDTHwGCELz2hwq68uCBbTEwggDP1fhCVhoBxwXy9IEyqS/AAfL0ggDsWFYUwAHy9AikCH/gIIIQMOSpALqOkzDTHwGCEDDkqQC68uCBbTHbPH/gIIIQXQRo3LqOlTDTHwGCEF0EaNy68uCB0x8BMds8f+AgghCdLt5RuuMCJicoKQH4ER0RJBEdERwRIxEcERsRIhEbERoRIREaERkRIBEZERgRHxEYERcRHhEXERYRJBEWERURIxEVERQRIhEUERMRIRETERIRIBESERERHxERERARHhEQDxEkDw4RIw4NESINDBEhDAsRIAsKER8KCREeCQgRJAgHESMHBhEiBhsB+BEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWESQRFhEVESMRFREUESIRFBETESERExESESAREhERER8REREQER4REA8RJA8OESMODREiDQwRIQwLESALChEfCgkRHgkIESQIBxEjBwYRIgYcAehXE1cWVxZXFlcWVxZXFvgjcVYaVhnIWYIQSnCdGVADyx/LHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BcIBAfwQDbW3bPDARFREXERURFBEWERQRExEVERMREhEUERIOERMODRESDVDuDWAC/AURIQUEESAEAxEfAwIRHgIBESQB2zyBAQEgViQDESYBQTP0eG+lIJZQI9cAMFiWbCFtMm0B4hEeESURHhEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWER0RFhEVERwRFREUERsRFBETERoREz0dAvwFESEFBBEgBAMRHwMCER4CAREkAds8gQEBIFYjAxEmAUEz9HhvpSCWUCPXADBYlmwhbTJtAeIRHhElER4RHREkER0RHBEjERwRGxEiERsRGhEhERoRGREgERkRGBEfERgRFxEeERcRFhEdERYRFREcERURFBEbERQRExEaERM9HQB0ERIRGRESERERGBERERARFxEQDxEWDw4RFQ4NERQNDBETDAsREgsKEREKCREQCRCPEH4QbRBcEEsQOgL+BBESBAMREQMCERACUP7bPFAHINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WFcsfE/QAyx/LH8sfyx/LHxXLHxPLH8sfAfoCWPoCEssfEssfAsj0AFAE+gJYINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyQHMyR8gADpQVvQAE/QAygAhbrOWfwHKAMsflHAyygDiyx/KAAAEAcwD/hNfA4IJMS0AvvL0L4EBAVYfWfQNb6GSMG3fIG6SMG2Oh9DbPGwXbwfiggDQ0CFus/L0IG7y0IBvJ4FpSfhCUoDHBfL0gSmGIcIA8vRwgQEBKAYQWBBHA0h4yFVg2zzJAhETAlYhASBulTBZ9FowlEEz9BXiCFYRoVYRJ6iBJw9yayIE+qCBJxCpBBESVhKhVhbAAI86VhwBERN/c0MwbW1t2zwwfxEgVhLIWYIQibnSwlADyx/LHwH6AskQIwIREgIBESABcxAkQwBtbds8MOMOERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUYGAjJAL2VyARHREeER0RHBEeERwRGxEeERtWHhEbERoRGREYERcRFhEVERQRExESCRERCQkREAkQnxCeEJ0QnBCbEJoYFxYVFEMwAREfAds8ERwRHhEcERsRHREbERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVUSUAQBETERQRExESERMREhERERIREREQEREREA8REA8QX1UNAcQRFBEWERQRExEVERMREhEUERIRERETEREREBESERAPEREPDhEQDlUd2zwGERwGBhEbBgYRGgYGERkGBhEYBgYRFwYGERYGBhEVBgYRFAYGERMGBhESBgYREQYGERAGEG9V0FEC8jARGxEcERsRGhEcERoRGREcERkRGBEcERgRFxEcERcRFhEcERYRFREcERURFBEcERQRExEcERMREhEcERIREREcEREREBEcERAPERwPDhEcDg0RHA0MERwMCxEcCwoRHAoJERwJERwIBwZVQIFeThEd2zwBER4B8vR/KgPwgUyD+EJWGwHHBfL0ggCoPVYXs/L0VhCBAQEiWfQNb6GSMG3fIG6SMG2Oh9DbPGwXbwfiggDQ0CFus/L0IG7y0IBvJ4F/vgbAABby9CVEFHFEFIEBAQfIVWDbPMkCERMCUjAgbpUwWfRaMJRBM/QV4lYcAlYbAhETcmstASow0x8BghCdLt5RuvLggdMfATHbPH8uBLAgghDVVELhuo6VMNMfAYIQ1VRC4bry4IH6AAEx2zx/4CCCEHOqVom64wIgghAOJ00Ouo6bMNMfAYIQDidNDrry4IHTH9IA+gBVIGwT2zx/4CCCEMCb2Am6MDEyMwLGgSJl+EFvJBNfA4IKYloAvvL0L4IAtiUBgScQu/L0L6RWFZFxkXDigQEB+EJtbXBUcAVVQMhVYNs8yQIREgJWEwEgbpUwWfRaMJRBM/QV4vhCVhwDVhsDAhEUAgERFAERExAjaysC9MhVQIIQz0mdiVAGyx8Uyx8Syx8BINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFssHyVYcAXCAQH8EA21t2zwwERsRHBEbERoRGxEaERkRGhEZERgRGREYYCwAbBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA9VDgHEyFUwghBZTT4mUAXLHxPLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BggiYloBxfwQDbW3bPDBgApyBTIP4QlYbAccF8vRWEIEBASJZ9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+KCANDQIW6z8vQgbvLQgG8nXwZSEBESgQEB9FowVhwCVhsCERNyLwHEyFUwghCCkJauUAXLHxPLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BggiYloBxfwQDbW3bPDBgAvYRHBEdERwRGxEdERsRGhEdERoRGREdERkRGBEdERgRFxEdERcRFhEdERYRFREdERURFBEdERQRExEdERMREhEdERIREREdEREREBEdERAPER0PDhEdDg0RHQ0MER0MCxEdCwoRHQoJER0JER0IBwZVQNs8gTKpL8AB8vRcNAK8MNMfAYIQc6pWibry4IHTH9Mf0gBVIGwTggClhPhCVhYBxwXy9IEcuiKBTiC78vSBT7v4J28Q+EFvJBNfA4IImJaAoL7y9BLbPPhBbyQTXwNWEgFxf1UgbW1t2zwwfz9gAfCBatz4QlYdAccF8vQRGxEfERsRGhEeERoRGREdERkRGBEcERgRFxEfERcRFhEeERYRFREdERURFBEcERQRExEfERMREhEeERIREREdEREREBEcERAPER8PDhEeDg0RHQ0MERwMCxEfCwoRHgoJER0JCBEcCAcRHwc4BPqOsjDTHwGCEMCb2Am68uCB0x/TH9IAVSBsE4EtjfhCVh0BxwXy9IE4gSKBTiC88vQS2zx/4CCCEFDAnIW6jpUw0x8BghBQwJyFuvLggfoAATHbPH/gIIIQhQudrbqOlTDTHwGCEIULna268uCB+gABMds8f+AgghCaeVh2uj9AQUID0IIAjgv4QlYaAccF8vTbPIFZyQFWH77y9AukVhpWGVYfyFUgghCaCRwAUATLHxLLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYB+gLJVh0BggiYloBzfwQDbW3bPDBWE8AAhGA1AtKOj1YYAREecX9VIG1tbds8MOMOERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUERMRFBETERIRExESEREREhERERAREREQDxEQDxDvEN4QzRC8VQlgNgL4ERwRHREcERsRHBEbERoRGxEaERkRGhEZVhgRGhEYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA8Q7x0eELwQqxCaEIkQeBBnEFYQRRA0ECPbPAsRHAsLERsLCxEaC1E3AGQLERkLCxEYCwsRFwsLERYLCxEVCwsRFAsLERMLCxESCwsREQsLERALEL8QvhC9ELxVkAT+BhEeBgURHQUEERwEAxEfAwIRHgIBER0BERyBXk4RINs8AREhAfL0ER3jDxEaERwRGhEZERsRGREYERoRGBEXERkRFxEWERgRFhEVERcRFREWERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q3xDOEL0QrBCbEIoQeX85OjsC+oExvoEBASBWF1lWIQFBM/QMb6GUAdcAMJJbbeJus/L0ERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q31UcER5WHts8gQEBIAQRGAQTPTwC+oExvoEBASBWGFlWIQFBM/QMb6GUAdcAMJJbbeJus/L0ERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q31UcER5WHts8gQEBIAQRGQQTPT4AFBBoEFcQRhA1RAMANAIRHwIBESABIW6VW1n0WjCYyAHPAEEz9ELiAAgWtgkFADwCER8CAREgASFulVtZ9FowmMgBzwBBM/RC4hEVERQB8BEbER8RGxEaER4RGhEZER0RGREYERwRGBEXER8RFxEWER4RFhEVER0RFREUERwRFBETER8RExESER4REhERER0REREQERwREA8RHw8OER4ODREdDQwRHAwLER8LChEeCgkRHQkIERwIBxEfBwYRHgYFER0FBBEcBEMC7BEcER0RHBEbER0RGxEaER0RGhEZER0RGREYER0RGBEXER0RFxEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zwRHaBbTwLyERwRHREcERsRHREbERoRHREaERkRHREZERgRHREYERcRHREXERYRHREWERURHREVERQRHREUERMRHRETERIRHRESERERHRERERARHREQDxEdDw4RHQ4NER0NDBEdDAsRHQsKER0KCREdCREdCAcGVUDbPBEcER0RHFtQA/qOmDDTHwGCEJp5WHa68uCB0z/6AFlsEts8f+DAAI9a+QEggvBsj0T0X+20zf7U3o2xSqWxOtVdQw91nQZpIQt0xI/j37qOhjDbPH/bMeCC8Lz693aQfHGcyNN52PGUqqon6Moocc1ZF4FyHyFaRUUBuo6F2zx/2zHgkTDicFNUVQT8AxEfAwIRHgIBER0BERyBXk4RINs8AREhAfL0LoEBAVYfWfQNb6GSMG3fIG6SMG2Oh9DbPGwXbwfiggDQ0CFus/L0IG7y0IBvJ4IAqIsmwAHy9FYjjhmBAQEgVh9ZVigBQTP0DG+hlAHXADCSW23i4w2BOJYhbrPy9CBu8tCAf3JERQAygQEBIFYeWVYoAUEz9AxvoZQB1wAwkltt4gT8+CMRJeMPVhCVER1WJaCZERtWJaARGxEd4hEcViWgBBEhBAMRIAMCER8CAREdAREcVhyBAQERHchVYNs8yRApAREXAVYfASBulTBZ9FowlEEz9BXiERWkAREbAREfoBETER4RExESER0REhERERwREREQERsREA8RGg8OERkORkdrSAH4JIEBAVYoWfQNb6GSMG3fIG6SMG2a0NMf0x9ZbBJvAuIRHREkER0RHBEjERwRGxEiERsRGhEhERoRGREgERkRGBEfERgRFxEeERcRFhEkERYRFREjERURFBEiERQRExEhERMREhEgERIREREfEREREBEeERAPESQPDhEjDkkB+CWBAQFWKFn0DW+hkjBt3yBukjBtmtDTH9MfWWwSbwLiER0RJBEdERwRIxEcERsRIhEbERoRIREaERkRIBEZERgRHxEYERcRHhEXERYRJBEWERURIxEVERQRIhEUERMRIRETERIRIBESERERHxERERARHhEQDxEkDw4RIw5KAXANERgNDBEXDAsRFgsKERUKCREUCQgREwgHERIHCRERCQUREAUQTxBeTcAQSxBqCAkQV0YERRXbPEwBuA0RIg0MESEMCxEgCwoRHwoJER4JCBEkCAcRIwcGESIGBREhBQQRIAQDER8DAhEeAgERKAFWJds8gQEBP8hZAssfyx/JAxEhAxAtAREnASBulTBZ9FowlEEz9BXiSwHADREiDQwRIQwLESALChEfCgkRHgkIESQIBxEjBwYRIgYFESEFBBEgBAMRHwMCER4CAREoAVYl2zyBAQE/yFkCyx/LH8kDESIDEC0BEScBIG6VMFn0WjCUQTP0FeIRHxEeSwAwcCAwIm6zmzABIG7y0IBvIjABkTLiAaQBAvaBAQFUVQBSQEEz9AxvoZQB1wAwkltt4m6zjhuBAQEgEEZDMCFulVtZ9FowmMgBzwBBM/RC4gLgbXAggQEBVFgAWfSEb6UgllAj1wAwWJZsIW0ybQHikIroW8EDjhxbgQEBIBBGQzAhbpVbWfRaMJjIAc8AQTP0QuIC4CFNTgBuAqQkbpF/mSQgbvLQgFIwueKVMzNUEiGRMuKBAQFTCVAzQTP0eG+lIJZQI9cAMFiWbCFtMm0B4gBybrOZASBu8tCAUiC8kjFw4o4jUAWBAQH0WjCBAQFUEyJBYCFulVtZ9FowmMgBzwBBM/RC4gKSXwPiAJwRGxEcERsRGhEbERoRGREaERkRGBEZERgRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPVQ4B2BEbERwRGxEaERsRGlYZERsRGREaERkRGBEZERgRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPEO8Q3hDNELwQqxCaEIkQeBBnEFYQRRA0QTDbPFEB9FMwvvLnfyCBA+ipBMhwAcsfjQSVVNEVCBmcm9tIGNhbXBhaWdugzxbJggiYloBwgjD//////////vhEbpf4JfgVf/hk3iGh+BGgyIIQD4p+pQHLH8s/UAP6AlAEINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUgGE+Cgg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxZwAcoAAfoCfwHKABLMyYIJycOAIwJzfwRDE21t2zwwEqEBYAH0ERwRHhEcERsRHREbERoRHhEaERkRHREZERgRHhEYERcRHREXERYRHhEWERURHREVERQRHhEUERMRHRETERIRHhESERERHRERERARHhEQDxEdDw4RHg4NER0NDBEeDAsRHQsKER4KCREdCQgRHggHER0HBhEeBgURHQVWBBjbPNs8VxtwiAERHAFbWVpeBBjbPNs8Vxt/iAERHAFbXF1eA/YEER4EAxEdAwIRHgIBER0BER7bPBEcER0RHBEbERwRGxEaERsRGhEZERoRGREYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA9VDlYe2zwRHaARGxEcERsRGhEbERpbV1gCsFYRgQEBI1n0DW+hkjBt3yBukjBtjofQ2zxsF28H4oIAu8UhbrPy9CBu8tCAbycnoFVQgQEBB8hVYNs8yQMREwMSARETASBulTBZ9FowlEEz9BXiERAXoAZyawCEERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUERMRFBETERIRExESEREREhERERAREREQDxEQD1UOABCCANAwVhzy9AAWAAAAAFJlc3VtZWQAFPhCVh0BxwXy4IQAEoIAnbBWHLPy9AAWAAAAAFN0b3BwZWQBDvhCAX9t2zxfATxtbSJus5lbIG7y0IBvIgGRMuIQJHADBIBCUCPbPDBgAcrIcQHKAVAHAcoAcAHKAlAFINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUAP6AnABymgjbrORf5MkbrPilzMzAXABygDjDSFus5x/AcoAASBu8tCAAcyVMXABygDiyQH7CGEAmH8BygDIcAHKAHABygAkbrOdfwHKAAQgbvLQgFAEzJY0A3ABygDiJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4nABygACfwHKAALJWMwCASBkZQIBIGxtAgFYZmcCAUhzdAIZsF72zzbPFcQXw9s0YIdoAs2yxTbPBEcER4RHBEbER0RGxEaERwRGhEZERsRGREYERoRGBEXERkRFxEWERgRFhEVERcRFREUERYRFBETERURExESERQREhERERMREREQERIREA8REQ8OERAOEN9VHNs8VxBfD2zRgh2kABFYbASSCAKy3UxK88vRtcFEjoYrkbCFqA96BAQFdoFYUWVn0DW+hkjBt3yBukjBtjofQ2zxsF28H4m6zj0eBAQFdoFRxQ6BWFllZ9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+IgbpIwbY6NIG7y0IBvJ8hVYNs8yeIgbpUwWfRaMJRBM/QV4t4BpAFycmsAYlB2INdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WFMsHEvQA9AAB+gJY+gIB+gICASBubwARuCvu1E0NIAAYAhm22Btnm2eK4gvh7Zowh3AC7bQEW2eCI4IjoiOCI2IjgiNiI0IjYiNCIyIjQiMiIwIjIiMCIuIjAiLiIsIi4iLCIqIiwiKiIoIioiKCImIigiJiIkIiYiJCIiIiQiIiIgIiIiIB4iIB6qHbZ4riC+HtmiQN0kYNsyQN3loQDeTt4PxEDdJGDbvQh3EACPgnbxABPIEBAVYRAln0DW+hkjBt3yBukjBtjofQ2zxsF28H4nIAXPpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB0wf0BPQE+gD6APoAVWACASB1dgIZs9J2zzbPFcQXw9s0YIeIAhmuju2ebZ4riC+HtmjAh3cD9a3pbZ5tniuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ECCJCCAYiQAYEIj4EAiI8AiI6CCI4CAYiNgYEIjQEAiIyAiIwCCIuCAYiLAYEIioEAiIoAiImCCIkCQId4eQAEVhwB9FYaVhlWHlYcVhtWG1YbVhtWG1YbVhpWEVYZVhlWGVYWVhpWGlYaViERHBEwERwRGxEvERsRGhEuERoRGREtERkRGBEsERgRFxErERcRFhEqERYRFREpERURFBEoERQRExEnERMREhEmERIRERElEREREBEkERAPESMPegAYAxERAwIREAJQ/lWEAvoOESIODREhDQwRIAwLER8LChEeCgkRHQkIETAIBxEvBwYRLgYFES0FBBEsBAMRKwMCESoCAREpAREo2zwm+CdvEPgoVHVHKxEcESQRHBEbESMRGxEaESIRGhEZESERGREYESARGBEXER8RFxEWER4RFhEVER0RFREUESQRFIR7AvgRExEjERMREhEiERIREREhEREREBEgERAPER8PDhEeDg0RHQ0MESQMCxEjCwoRIgoJESEJCBEgCAcRHwcGER4GBREdBQQRJAQDESMDAhEiAgERIQERINs8ERwRHREcERsRHREbERoRHREaERkRHREZERgRHREYERcRHREXgnwC9hEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zxWHBEcER4RHBEbER0RGxEaER4RGhEZER0RGREYER4RGBEXER0RFxEWER4RFoF9AvgRFREdERURFBEeERQRExEdERMREhEeERIREREdEREREBEeERAPER0PDhEeDg0RHQ0MER4MCxEdCwoRHgoJER0JCBEeCAcRHQcGER4GBREdBQQRHgQDER0DAhEeAgERHQERHts8ERwRHREcERsRHREbERoRHREaERkRHREZg34C/hEYER0RGBEXER0RFxEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zwRIBE0ESARHxEzER8RHhEyER4RHRExER0RHBEwERwRGxEvERt/gAM6LsMBkXDgVhuRcODbPJFw4Ns8s5Fw4Ns8s5Fw4H+BgoMB/BEaES4RGhEZES0RGREYESwRGBEXESsRFxEWESoRFhEVET0RFREUETwRFBETETsRExESEToREhERETkREREQETgREA8RNw8OETYODRE1DQwRJAwLESMLChEiCgkRKQkIESgIBxEnBwYRJgYFESUFBBEhBAMRMwMCETQCAREyAYUALlYUbpFw4PgjLqFWFSBu8tCAggFRgKi8AQjbPCa8hAAW+CdvEIIQHc1lAL4ANFYTwACOEPgnbxCCEB3NZQChJ6FwtgngUxahAfxWMw4RFQ4OERQODhETDg4REg4RMhE+ETIRMRE9ETERMBE8ETARLxE7ES8RLhE6ES4RLRE5ES0RLBE4ESwRKxE3ESsRMhE2ETIRMRE1ETERMBE0ETARLxEzES8RLhEyES4RLRExES0RLBEwESwRKxEvESsRJREtESURJBEsESSGACQRIxErESMRIhElESIRIhEjESID5O1E0NQB+GPSAAGO0ts8Vx0RGxEcERsRGhEbERoRGREaERkRGBEZERgRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPVQ7g+CjXCwqDCbry4InbPAnRVQfbPImKiwACLwLU+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHSANMf+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAH6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdQB0Ns8BoyNAdD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAYEBAdcA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHUAdD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAY8B7IIAxrH4QlKgxwXy9HBwbW1tf20lcFR3d1RwAFRwACBtIfgoAgERGQERGNs8ERMRGxETERMRGhETERMRGBETERARFxEQDxEWDw4RFQ4NERQNDBETDAsREgsMEREMCxEQCxDPEK4QjRCcEHsQahBZEEgQN0ZQQTCQACz0BPQE0gDSAAGS0x+SbQHi0x/SAFVQAfb6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdMf9ATTH9Mf0x/TH9Mf0x/TH9Mf+gD6ANMf0x/UMND0BPoA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiDERGBEdERgRGBEcERgRGBEbERgRGBEaERiOAEgRGBEZERgRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIAqvpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHU1DDQgQEB1wCBAQHXADAQaRBoEGcBnHBUEDEDyFUwUDTLAwH6AgEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYBINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyZEAgnBZyHABywFzAcsBcAHLABLMzMn5AMhyAcsBcAHLABLKB8v/ydAg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCI');
    const __system = Cell.fromBase64('te6cckEClAEAK/8AAQHAAQEFoBiVAgEU/wD0pBP0vPLICwMCAWIEYwLw0AHQ0wMBcbCjAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IhUUFMDbwT4YQL4Yts8ERwRHhEcERsRHREbERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBEShwUCkhERERMREREQERIREA8REQ8OERAOEN9VHNs88uCCyPhDAcx/AcoAER0RHBEbERoRGREYERcRFhEVERQRExESEREREFXg2zzJ7VQGXwTK7aLt+wGOtIAg1yFwIddJwh+VMCDXCx/eghCJudLCuo6X0x8BghCJudLCuvLggdMf+gBZbBLbPH/gMH/gcCHXScIflTAg1wsf3iCCEE0KQNy64wIgghDVMnbbuuMCIIIQc2LQnLpSBwgJAeQw0x8BghBNCkDcuvLggdMf+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiBJsEshZghAWGTV0UAPLH8sfASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFslWHQGCCJiWgHF/BANtbds8MH9dAFIw0x8BghDVMnbbuvLggdM/ATEwggDmm/hCUiDHBfL0gQjgVhTAAfL0fwL+jvsw0x8BghBzYtCcuvLggdM/+gD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIVBMDECNsFDAyggDmm/hCUkDHBfL0VhqCAJ8zA8cFEvL0gWZdVhXAAfL0CqQKgQPoqFMEqIEnD6CBJxCpBGahIcIAkTHjDRKgAX/gIAoMAvgRHREeER0RHBEeERwRGxEeERtWHhEbERoRGREYERcRFhEVERQRExESEREREA8ODQwLCgkIBwYFBEMTAREfAds8ERwRHREcERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUERMRFBETTQsAMBESERMREhERERIREREQEREREA8REA9VDgSighCJpx3muo6VMNMfAYIQiacd5rry4IHTHwEx2zx/4CCCEJMvgFC6jpUw0x8BghCTL4BQuvLggfQEATHbPH/gIIIQFE0Ta7rjAiCCEEqwm0i6DRMZGgL2ERwRHREcERsRHREbERoRHREaERkRHREZERgRHREYERcRHREXERYRHREWERURHREVERQRHREUERMRHRETERIRHRESERERHRERERARHREQDxEdDw4RHQ4NER0NDBEdDAsRHQsKER0KCREdCREdCAcGVUDbPIIAr+T4QW8kWQ4D/hNfA4IJMS0AvvL0L4EBAVYfWfQNb6GSMG3fIG6SMG2Oh9DbPGwXbwfiggDQ0CFus/L0IG7y0IBvJ4FpSfhCUoDHBfL0gSmGIcIA8vRwgQEBKAYQWBBHA0h4yFVg2zzJAhETAlYhASBulTBZ9FowlEEz9BXiCFYRoVYRJ6iBJw+Saw8E+qCBJxCpBBESVhKhVhbAAI86VhwBERN/c0MwbW1t2zwwfxEgVhLIWYIQibnSwlADyx/LHwH6AskQIwIREgIBESABcxAkQwBtbds8MOMOERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUXV0QEgL2VyARHREeER0RHBEeERwRGxEeERtWHhEbERoRGREYERcRFhEVERQRExESCRERCQkREAkQnxCeEJ0QnBCbEJoYFxYVFEMwAREfAds8ERwRHhEcERsRHREbERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVTREBxBEUERYRFBETERURExESERQREhERERMREREQERIREA8REQ8OERAOVR3bPAYRHAYGERsGBhEaBgYRGQYGERgGBhEXBgYRFgYGERUGBhEUBgYREwYGERIGBhERBgYREAYQb1XQTQBAERMRFBETERIRExESEREREhERERAREREQDxEQDxBfVQ0C8hEcER0RHBEbER0RGxEaER0RGhEZER0RGREYER0RGBEXER0RFxEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zwRGxEcERtZFAL6ERoRHBEaERkRHBEZERgRHBEYERcRHBEXERYRHBEWERURHBEVERQRHBEUERMRHBETERIRHBESERERHBERERARHBEQDxEcDw4RHA4NERwNDBEcDAsRHAsKERwKCREcCREcCAcGVUCBXk4RHds8AREeAfL0gW+qVhLy9C6BAQF3FQP+9IVvpSCREpUxbTJtAeKQiuhbVx0IpFYWcIBAf1UgbW1t2zwwERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q3xDOEL0QrBCbChB5EGgQVxZdGAP+IG6SMG2Oh9DbPGwXbwfiIG7y0IBvJ4EBASBWJ1Qio0Ez9AxvoZQB1wAwkltt4iBus44bIG7y0ICBI6VTFLvy9FIwoVEzoVEjoVDjoVAtkTDiWKAVFEMwcFAGgQEBB8hVYNs8yQIREQJWEQEgbpUwWfRaMJRBM/QV4oEBASEREZJrFwAkWfR4b6UglALUMFiVMW0ybQHiAAwQRhA1RAMDWjDTHwGCEBRNE2u68uCBbTEw2zwhwgCOhVYZIts83lYZcIMGf1UgbW1t2zwwf1hNXQT8jxUw0x8BghBKsJtIuvLggds8bBbbPH/gIIIQTqRAtrqO0zDTHwGCEE6kQLa68uCBbTEwgTKpL8AB8vSCAM/V+EJWGgHHBfL0CaT4QW8kE18DUwSoMYEnD6CBJxCpBCDCAI6NVhoBf3NDMG1tbds8MJEw4gl/4CCCELz2hwq6iRtdIgP0ggDg3/hCViABxwXy9IIA3+FWFcAA8vSBFBAiwACRf5MiwAHi8vSCAPnII26Rf5gjIG7y0IDCAOLy9IEBAVRWAFn0hG+lIJZQI9cAMFiWbCFtMm0B4pCK6FuBAQFUVQBZ9IRvpSCWUCPXADBYlmwhbTJtAeKQiuhbVxMcHiEB+BEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWESQRFhEVESMRFREUESIRFBETESERExESESAREhERER8REREQER4REA8RJA8OESMODREiDQwRIQwLESALChEfCgkRHgkIESQIBxEjBwYRIgYdAvwFESEFBBEgBAMRHwMCER4CAREkAds8gQEBIFYkAxEmAUEz9HhvpSCWUCPXADBYlmwhbTJtAeIRHhElER4RHREkER0RHBEjERwRGxEiERsRGhEhERoRGREgERkRGBEfERgRFxEeERcRFhEdERYRFREcERURFBEbERQRExEaERM4IAH4ER0RJBEdERwRIxEcERsRIhEbERoRIREaERkRIBEZERgRHxEYERcRHhEXERYRJBEWERURIxEVERQRIhEUERMRIRETERIRIBESERERHxERERARHhEQDxEkDw4RIw4NESINDBEhDAsRIAsKER8KCREeCQgRJAgHESMHBhEiBh8C/AURIQUEESAEAxEfAwIRHgIBESQB2zyBAQEgViMDESYBQTP0eG+lIJZQI9cAMFiWbCFtMm0B4hEeESURHhEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWER0RFhEVERwRFREUERsRFBETERoREzggAHQREhEZERIREREYEREREBEXERAPERYPDhEVDg0RFA0MERMMCxESCwoREQoJERAJEI8QfhBtEFwQSxA6AehXE1cWVxZXFlcWVxZXFvgjcVYaVhnIWYIQSnCdGVADyx/LHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BcIBAfwQDbW3bPDARFREXERURFBEWERQRExEVERMREhEUERIOERMODRESDVDuDV0E/o40MNMfAYIQvPaHCrry4IFtMTCCAM/V+EJWGgHHBfL0gTKpL8AB8vSCAOxYVhTAAfL0CKQIf+AgghAw5KkAuo6TMNMfAYIQMOSpALry4IFtMds8f+AgghBdBGjcuo6VMNMfAYIQXQRo3Lry4IHTHwEx2zx/4CCCEJ0u3lG64wIjJyksAvIwERsRHBEbERoRHBEaERkRHBEZERgRHBEYERcRHBEXERYRHBEWERURHBEVERQRHBEUERMRHBETERIRHBESERERHBERERARHBEQDxEcDw4RHA4NERwNDBEcDAsRHAsKERwKCREcCREcCAcGVUCBXk4RHds8AREeAfL0dyQCxoEiZfhBbyQTXwOCCmJaAL7y9C+CALYlAYEnELvy9C+kVhWRcZFw4oEBAfhCbW1wVHAFVUDIVWDbPMkCERICVhMBIG6VMFn0WjCUQTP0FeL4QlYcA1YbAwIRFAIBERQBERMQI2slAvTIVUCCEM9JnYlQBssfFMsfEssfASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbLB8lWHAFwgEB/BANtbds8MBEbERwRGxEaERsRGhEZERoRGREYERkRGF0mAGwRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPVQ4D8IFMg/hCVhsBxwXy9IIAqD1WF7Py9FYQgQEBIln0DW+hkjBt3yBukjBtjofQ2zxsF28H4oIA0NAhbrPy9CBu8tCAbyeBf74GwAAW8vQlRBRxRBSBAQEHyFVg2zzJAhETAlIwIG6VMFn0WjCUQTP0FeJWHAJWGwIRE5JrKAHEyFUwghBZTT4mUAXLHxPLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BggiYloBxfwQDbW3bPDBdASow0x8BghCdLt5RuvLggdMfATHbPH8qApyBTIP4QlYbAccF8vRWEIEBASJZ9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+KCANDQIW6z8vQgbvLQgG8nXwZSEBESgQEB9FowVhwCVhsCEROSKwHEyFUwghCCkJauUAXLHxPLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJVh0BggiYloBxfwQDbW3bPDBdBLAgghDVVELhuo6VMNMfAYIQ1VRC4bry4IH6AAEx2zx/4CCCEHOqVom64wIgghAOJ00Ouo6bMNMfAYIQDidNDrry4IHTH9IA+gBVIGwT2zx/4CCCEMCb2Am6LTIzOwL2ERwRHREcERsRHREbERoRHREaERkRHREZERgRHREYERcRHREXERYRHREWERURHREVERQRHREUERMRHRETERIRHRESERERHRERERARHREQDxEdDw4RHQ4NER0NDBEdDAsRHQsKER0KCREdCREdCAcGVUDbPIEyqS/AAfL0WS4D0IIAjgv4QlYaAccF8vTbPIFZyQFWH77y9AukVhpWGVYfyFUgghCaCRwAUATLHxLLHwEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYB+gLJVh0BggiYloBzfwQDbW3bPDBWE8AAel0vAtKOj1YYAREecX9VIG1tbds8MOMOERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUERMRFBETERIRExESEREREhERERAREREQDxEQDxDvEN4QzRC8VQldMAL4ERwRHREcERsRHBEbERoRGxEaERkRGhEZVhgRGhEYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA8Q7x0eELwQqxCaEIkQeBBnEFYQRRA0ECPbPAsRHAsLERsLCxEaC00xAGQLERkLCxEYCwsRFwsLERYLCxEVCwsRFAsLERMLCxESCwsREQsLERALEL8QvhC9ELxVkAK8MNMfAYIQc6pWibry4IHTH9Mf0gBVIGwTggClhPhCVhYBxwXy9IEcuiKBTiC78vSBT7v4J28Q+EFvJBNfA4IImJaAoL7y9BLbPPhBbyQTXwNWEgFxf1UgbW1t2zwwfzxdAfCBatz4QlYdAccF8vQRGxEfERsRGhEeERoRGREdERkRGBEcERgRFxEfERcRFhEeERYRFREdERURFBEcERQRExEfERMREhEeERIREREdEREREBEcERAPER8PDhEeDg0RHQ0MERwMCxEfCwoRHgoJER0JCBEcCAcRHwc0BP4GER4GBREdBQQRHAQDER8DAhEeAgERHQERHIFeThEg2zwBESEB8vQRHeMPERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERYRExEVERMREhEUERIRERETEREREBESERAPEREPDhEQDhDfEM4QvRCsEJsQihB5dzU3OgL6gTG+gQEBIFYXWVYhAUEz9AxvoZQB1wAwkltt4m6z8vQRGhEcERoRGREbERkRGBEaERgRFxEZERcRFhEYERYRFREXERURFBEWERQRExEVERMREhEUERIRERETEREREBESERAPEREPDhEQDhDfVRwRHlYe2zyBAQEgBBEYBBM4NgA0AhEfAgERIAEhbpVbWfRaMJjIAc8AQTP0QuIC+oExvoEBASBWGFlWIQFBM/QMb6GUAdcAMJJbbeJus/L0ERoRHBEaERkRGxEZERgRGhEYERcRGREXERYRGBEWERURFxEVERQRFhEUERMRFRETERIRFBESERERExERERAREhEQDxERDw4REA4Q31UcER5WHts8gQEBIAQRGQQTODkACBa2CQUAPAIRHwIBESABIW6VW1n0WjCYyAHPAEEz9ELiERURFAAUEGgQVxBGEDVEAwT6jrIw0x8BghDAm9gJuvLggdMf0x/SAFUgbBOBLY34QlYdAccF8vSBOIEigU4gvPL0Ets8f+AgghBQwJyFuo6VMNMfAYIQUMCchbry4IH6AAEx2zx/4CCCEIULna26jpUw0x8BghCFC52tuvLggfoAATHbPH/gIIIQmnlYdro8SUtPAfARGxEfERsRGhEeERoRGREdERkRGBEcERgRFxEfERcRFhEeERYRFREdERURFBEcERQRExEfERMREhEeERIREREdEREREBEcERAPER8PDhEeDg0RHQ0MERwMCxEfCwoRHgoJER0JCBEcCAcRHwcGER4GBREdBQQRHAQ9BPwDER8DAhEeAgERHQERHIFeThEg2zwBESEB8vQugQEBVh9Z9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+KCANDQIW6z8vQgbvLQgG8nggCoiybAAfL0ViOOGYEBASBWH1lWKAFBM/QMb6GUAdcAMJJbbeLjDYE4liFus/L0IG7y0IB3kj4/ADKBAQEgVh5ZVigBQTP0DG+hlAHXADCSW23iBPz4IxEl4w9WEJURHVYloJkRG1YloBEbER3iERxWJaAEESEEAxEgAwIRHwIBER0BERxWHIEBAREdyFVg2zzJECkBERcBVh8BIG6VMFn0WjCUQTP0FeIRFaQBERsBER+gERMRHhETERIRHRESERERHBERERARGxEQDxEaDw4RGQ5AQmtFAfgkgQEBVihZ9A1voZIwbd8gbpIwbZrQ0x/TH1lsEm8C4hEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWESQRFhEVESMRFREUESIRFBETESERExESESAREhERER8REREQER4REA8RJA8OESMOQQG4DREiDQwRIQwLESALChEfCgkRHgkIESQIBxEjBwYRIgYFESEFBBEgBAMRHwMCER4CAREoAVYl2zyBAQE/yFkCyx/LH8kDESEDEC0BEScBIG6VMFn0WjCUQTP0FeJEAfglgQEBVihZ9A1voZIwbd8gbpIwbZrQ0x/TH1lsEm8C4hEdESQRHREcESMRHBEbESIRGxEaESERGhEZESARGREYER8RGBEXER4RFxEWESQRFhEVESMRFREUESIRFBETESERExESESAREhERER8REREQER4REA8RJA8OESMOQwHADREiDQwRIQwLESALChEfCgkRHgkIESQIBxEjBwYRIgYFESEFBBEgBAMRHwMCER4CAREoAVYl2zyBAQE/yFkCyx/LH8kDESIDEC0BEScBIG6VMFn0WjCUQTP0FeIRHxEeRAAwcCAwIm6zmzABIG7y0IBvIjABkTLiAaQBAXANERgNDBEXDAsRFgsKERUKCREUCQgREwgHERIHCRERCQUREAUQTxBeTcAQSxBqCAkQV0YERRXbPEYC9oEBAVRVAFJAQTP0DG+hlAHXADCSW23ibrOOG4EBASAQRkMwIW6VW1n0WjCYyAHPAEEz9ELiAuBtcCCBAQFUWABZ9IRvpSCWUCPXADBYlmwhbTJtAeKQiuhbwQOOHFuBAQEgEEZDMCFulVtZ9FowmMgBzwBBM/RC4gLgIUdIAG4CpCRukX+ZJCBu8tCAUjC54pUzM1QSIZEy4oEBAVMJUDNBM/R4b6UgllAj1wAwWJZsIW0ybQHiAHJus5kBIG7y0IBSILySMXDijiNQBYEBAfRaMIEBAVQTIkFgIW6VW1n0WjCYyAHPAEEz9ELiApJfA+IC7BEcER0RHBEbER0RGxEaER0RGhEZER0RGREYER0RGBEXER0RFxEWER0RFhEVER0RFREUER0RFBETER0RExESER0REhERER0REREQER0REA8RHQ8OER0ODREdDQwRHQwLER0LChEdCgkRHQkRHQgHBlVA2zwRHaBYSgCcERsRHBEbERoRGxEaERkRGhEZERgRGREYERcRGBEXERYRFxEWERURFhEVERQRFREUERMRFBETERIRExESEREREhERERAREREQDxEQD1UOAvIRHBEdERwRGxEdERsRGhEdERoRGREdERkRGBEdERgRFxEdERcRFhEdERYRFREdERURFBEdERQRExEdERMREhEdERIREREdEREREBEdERAPER0PDhEdDg0RHQ0MER0MCxEdCwoRHQoJER0JER0IBwZVQNs8ERwRHREcWEwB2BEbERwRGxEaERsRGlYZERsRGREaERkRGBEZERgRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPEO8Q3hDNELwQqxCaEIkQeBBnEFYQRRA0QTDbPE0B9FMwvvLnfyCBA+ipBMhwAcsfjQSVVNEVCBmcm9tIGNhbXBhaWdugzxbJggiYloBwgjD//////////vhEbpf4JfgVf/hk3iGh+BGgyIIQD4p+pQHLH8s/UAP6AlAEINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WTgGE+Cgg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxZwAcoAAfoCfwHKABLMyYIJycOAIwJzfwRDE21t2zwwEqEBXQP6jpgw0x8BghCaeVh2uvLggdM/+gBZbBLbPH/gwACPWvkBIILwbI9E9F/ttM3+1N6NsUqlsTrVXUMPdZ0GaSELdMSP49+6joYw2zx/2zHggvC8+vd2kHxxnMjTedjxlKqqJ+jKKHHNWReBch8hWkVFAbqOhds8f9sx4JEw4nBQVFcB9BEcER4RHBEbER0RGxEaER4RGhEZER0RGREYER4RGBEXER0RFxEWER4RFhEVER0RFREUER4RFBETER0RExESER4REhERER0REREQER4REA8RHQ8OER4ODREdDQwRHgwLER0LChEeCgkRHQkIER4IBxEdBwYRHgYFER0FUQP2BBEeBAMRHQMCER4CAREdAREe2zwRHBEdERwRGxEcERsRGhEbERoRGREaERkRGBEZERgRFxEYERcRFhEXERYRFREWERURFBEVERQRExEUERMREhETERIRERESEREREBERERAPERAPVQ5WHts8ER2gERsRHBEbERoRGxEaWFJTArBWEYEBASNZ9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+KCALvFIW6z8vQgbvLQgG8nJ6BVUIEBAQfIVWDbPMkDERMDEgEREwEgbpUwWfRaMJRBM/QV4hEQF6AGkmsAhBEZERoRGREYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA9VDgQY2zzbPFcbcIgBERwBWFVWWwAQggDQMFYc8vQAFgAAAABSZXN1bWVkBBjbPNs8Vxt/iAERHAFYWVpbABT4QlYdAccF8uCEABKCAJ2wVhyz8vQAFgAAAABTdG9wcGVkAQ74QgF/bds8XAE8bW0ibrOZWyBu8tCAbyIBkTLiECRwAwSAQlAj2zwwXQHKyHEBygFQBwHKAHABygJQBSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlAD+gJwAcpoI26zkX+TJG6z4pczMwFwAcoA4w0hbrOcfwHKAAEgbvLQgAHMlTFwAcoA4skB+wheAJh/AcoAyHABygBwAcoAJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4iRus51/AcoABCBu8tCAUATMljQDcAHKAOJwAcoAAn8BygACyVjMAfABER0BERwg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYBERoBygABERgByx8BERYg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYBERQg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbIBgUREwVgAv4EERIEAxERAwIREAJQ/ts8UAcg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYVyx8T9ADLH8sfyx/LH8sfFcsfE8sfyx8B+gJY+gISyx8Syx8CyPQAUAT6Algg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJAczJYWIAOlBW9AAT9ADKACFus5Z/AcoAyx+UcDLKAOLLH8oAAAQBzAIBIGSCAgEgZWwCAVhmaAIZsF72zzbPFcQXw9s0YIdnAARWGwLNssU2zwRHBEeERwRGxEdERsRGhEcERoRGREbERkRGBEaERgRFxEZERcRFhEYERYRFREXERURFBEWERQRExEVERMREhEUERIRERETEREREBESERAPEREPDhEQDhDfVRzbPFcQXw9s0YIdpASSCAKy3UxK88vRtcFEjoYrkbCFqA96BAQFdoFYUWVn0DW+hkjBt3yBukjBtjofQ2zxsF28H4m6zj0eBAQFdoFRxQ6BWFllZ9A1voZIwbd8gbpIwbY6H0Ns8bBdvB+IgbpIwbY6NIG7y0IBvJ8hVYNs8yeIgbpUwWfRaMJRBM/QV4t4BpAGSkmsAYlB2INdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WFMsHEvQA9AAB+gJY+gIB+gICAUhtgAIBIG5wAhmuju2ebZ4riC+HtmjAh28ABFYcA/Wt6W2ebZ4rkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRK5ErkSuRAgiQggGIkAGBCI+BAIiPAIiOggiOAgGIjYGBCI0BAIiMgIiMAgiLggGIiwGBCIqBAIiKAIiJggiJAkCHcX8B9FYaVhlWHlYcVhtWG1YbVhtWG1YbVhpWEVYZVhlWGVYWVhpWGlYaViERHBEwERwRGxEvERsRGhEuERoRGREtERkRGBEsERgRFxErERcRFhEqERYRFREpERURFBEoERQRExEnERMREhEmERIRERElEREREBEkERAPESMPcgL6DhEiDg0RIQ0MESAMCxEfCwoRHgoJER0JCBEwCAcRLwcGES4GBREtBQQRLAQDESsDAhEqAgERKQERKNs8JvgnbxD4KFR1RysRHBEkERwRGxEjERsRGhEiERoRGREhERkRGBEgERgRFxEfERcRFhEeERYRFREdERURFBEkERR6cwL4ERMRIxETERIRIhESERERIRERERARIBEQDxEfDw4RHg4NER0NDBEkDAsRIwsKESIKCREhCQgRIAgHER8HBhEeBgURHQUEESQEAxEjAwIRIgIBESEBESDbPBEcER0RHBEbER0RGxEaER0RGhEZER0RGREYER0RGBEXER0RF3l0AvYRFhEdERYRFREdERURFBEdERQRExEdERMREhEdERIREREdEREREBEdERAPER0PDhEdDg0RHQ0MER0MCxEdCwoRHQoJER0JER0IBwZVQNs8VhwRHBEeERwRGxEdERsRGhEeERoRGREdERkRGBEeERgRFxEdERcRFhEeERZ4dQL4ERURHREVERQRHhEUERMRHRETERIRHhESERERHRERERARHhEQDxEdDw4RHg4NER0NDBEeDAsRHQsKER4KCREdCQgRHggHER0HBhEeBgURHQUEER4EAxEdAwIRHgIBER0BER7bPBEcER0RHBEbER0RGxEaER0RGhEZER0RGXt2Av4RGBEdERgRFxEdERcRFhEdERYRFREdERURFBEdERQRExEdERMREhEdERIREREdEREREBEdERAPER0PDhEdDg0RHQ0MER0MCxEdCwoRHQoJER0JER0IBwZVQNs8ESARNBEgER8RMxEfER4RMhEeER0RMREdERwRMBEcERsRLxEbd3wDOi7DAZFw4FYbkXDg2zyRcODbPLORcODbPLORcOB/eHl7AC5WFG6RcOD4Iy6hVhUgbvLQgIIBUYCovAEI2zwmvHoANFYTwACOEPgnbxCCEB3NZQChJ6FwtgngUxahABb4J28QghAdzWUAvgH8ERoRLhEaERkRLREZERgRLBEYERcRKxEXERYRKhEWERURPREVERQRPBEUERMROxETERIROhESERERORERERAROBEQDxE3Dw4RNg4NETUNDBEkDAsRIwsKESIKCREpCQgRKAgHEScHBhEmBgURJQUEESEEAxEzAwIRNAIBETIBfQH8VjMOERUODhEUDg4REw4OERIOETIRPhEyETERPRExETARPBEwES8ROxEvES4ROhEuES0ROREtESwROBEsESsRNxErETIRNhEyETERNRExETARNBEwES8RMxEvES4RMhEuES0RMREtESwRMBEsESsRLxErESURLRElESQRLBEkfgAkESMRKxEjESIRJREiESIRIxEiABgDEREDAhEQAlD+VYQCGbPSds82zxXEF8PbNGCHgQACLwIBIIOTAgEghIYCGbbYG2ebZ4riC+HtmjCHhQAI+CdvEALttARbZ4IjgiOiI4IjYiOCI2IjQiNiI0IjIiNCIyIjAiMiIwIi4iMCIuIiwiLiIsIioiLCIqIigiKiIoIiYiKCImIiQiJiIkIiIiJCIiIiAiIiIgHiIgHqodtniuIL4e2aJA3SRg2zJA3eWhAN5O3g/EQN0kYNu9CHkQPk7UTQ1AH4Y9IAAY7S2zxXHREbERwRGxEaERsRGhEZERoRGREYERkRGBEXERgRFxEWERcRFhEVERYRFREUERURFBETERQRExESERMREhERERIREREQEREREA8REA9VDuD4KNcLCoMJuvLgids8CdFVB9s8iIyOAtT6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdIA0x/6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB1AHQ2zwGiYoALPQE9ATSANIAAZLTH5JtAeLTH9IAVVAB9vpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB0x/0BNMf0x/TH9Mf0x/TH9Mf0x/6APoA0x/TH9Qw0PQE+gD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIMREYER0RGBEYERwRGBEYERsRGBEYERoRGIsASBEYERkRGBEWERcRFhEVERYRFREUERURFBETERQRExESERMREgHQ+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAGBAQHXAPpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB1AHQ+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAGNAKr6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB1NQw0IEBAdcAgQEB1wAwEGkQaBBnAeyCAMax+EJSoMcF8vRwcG1tbX9tJXBUd3dUcABUcAAgbSH4KAIBERkBERjbPBETERsRExETERoRExETERgRExEQERcREA8RFg8OERUODREUDQwREwwLERILDBERDAsREAsQzxCuEI0QnBB7EGoQWRBIEDdGUEEwjwGccFQQMQPIVTBQNMsDAfoCASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJkACCcFnIcAHLAXMBywFwAcsAEszMyfkAyHIBywFwAcsAEsoHy//J0CDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgBPIEBAVYRAln0DW+hkjBt3yBukjBtjofQ2zxsF28H4pIAXPpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB0wf0BPQE+gD6APoAVWAAEbgr7tRNDSAAGFgyXWM=');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initCampaign_init_args({ $$type: 'Campaign_init_args', owner, campaignId, advertiser, payout, bot, usdtMasterAddress, usdtWalletBytecode, advertiserFeePercentage, affiliateFeePercentage })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const Campaign_errors: { [key: number]: { message: string } } = {
    2: { message: `Stack underflow` },
    3: { message: `Stack overflow` },
    4: { message: `Integer overflow` },
    5: { message: `Integer out of expected range` },
    6: { message: `Invalid opcode` },
    7: { message: `Type check error` },
    8: { message: `Cell overflow` },
    9: { message: `Cell underflow` },
    10: { message: `Dictionary error` },
    11: { message: `'Unknown' error` },
    12: { message: `Fatal error` },
    13: { message: `Out of gas error` },
    14: { message: `Virtualization error` },
    32: { message: `Action list is invalid` },
    33: { message: `Action list is too long` },
    34: { message: `Action is invalid or not supported` },
    35: { message: `Invalid source address in outbound message` },
    36: { message: `Invalid destination address in outbound message` },
    37: { message: `Not enough TON` },
    38: { message: `Not enough extra-currencies` },
    39: { message: `Outbound message does not fit into a cell after rewriting` },
    40: { message: `Cannot process a message` },
    41: { message: `Library reference is null` },
    42: { message: `Library change action error` },
    43: { message: `Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree` },
    50: { message: `Account state size exceeded limits` },
    128: { message: `Null reference exception` },
    129: { message: `Invalid serialization prefix` },
    130: { message: `Invalid incoming message` },
    131: { message: `Constraints error` },
    132: { message: `Access denied` },
    133: { message: `Contract stopped` },
    134: { message: `Invalid argument` },
    135: { message: `Code of a contract was not found` },
    136: { message: `Invalid address` },
    137: { message: `Masterchain support is not enabled for this contract` },
    1919: { message: `Insufficient USDT funds to make transfer` },
    2272: { message: `Only USDT Campaigns can accept excess TON` },
    2509: { message: `Must have at least one wallet to withdraw to` },
    5136: { message: `Only TON or USDT supported as payment methods` },
    7354: { message: `Bot can verify only op codes under 20000` },
    8805: { message: `Insufficient funds to create affiliate` },
    9125: { message: `withdrawableAmount must be <= pendingApprovalEarnings` },
    10630: { message: `Must withdraw a positive amount` },
    11661: { message: `Only advertiser can verify these events` },
    12734: { message: `Can only add op codes` },
    12969: { message: `Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER` },
    14465: { message: `Advertiser can verify only op codes over 20000` },
    14486: { message: `Cannot find cpa for the given op code` },
    19587: { message: `Only the advertiser can remove an existing affiliate` },
    20411: { message: `Insufficient contract funds to repay bot` },
    22985: { message: `Insufficient campaign funds` },
    24142: { message: `Campaign is not active` },
    26205: { message: `Only USDT Campaigns can accept USDT` },
    26953: { message: `Only affiliate can withdraw funds` },
    27356: { message: `Only advertiser can add user op codes` },
    28586: { message: `Advertiser can only modify affiliate earnings only if campaign is setup this requiresApprovalForWithdrawlFlag` },
    32702: { message: `Affiliate in ACTIVE state` },
    36363: { message: `Only the advertiser can remove the campaign and withdraw all funds` },
    40368: { message: `Contract stopped` },
    40466: { message: `Insufficient funds to deploy new campaign` },
    40755: { message: `Only advertiser can send tokens to this contract` },
    42372: { message: `Only bot can invoke this function` },
    43069: { message: `Cannot manually add affiliates to an public campaign` },
    43147: { message: `Inactive affiliate` },
    44215: { message: `Invalid indices` },
    45028: { message: `Insufficient gas fees to withdraw earnings` },
    46629: { message: `Reached max number of affiliates for this campaign` },
    48069: { message: `Affiliate does not exist for this id` },
    48874: { message: `Insufficient contract funds to make payment` },
    49469: { message: `Access denied` },
    50865: { message: `owner must be deployer` },
    53205: { message: `Only the advertiser can replenish the contract` },
    53296: { message: `Contract not stopped` },
    53456: { message: `Affiliate does not exist` },
    57313: { message: `Must be in state: STATE_CAMPAIGN_CREATED` },
    57567: { message: `Only advertiser can set campaign details` },
    59035: { message: `Only contract wallet allowed to invoke` },
    60504: { message: `Can replenish TON for gas fees for USDT camapigns only` },
    63944: { message: `Invalid campaignValidForNumDays param` },
}

const Campaign_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"ChangeOwner","header":2174598809,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwnerOk","header":846932810,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdminWithdraw","header":26200810,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"wallets","type":{"kind":"dict","key":"address","value":"bool"}}]},
    {"name":"AdminUpdateFeeBalance","header":2718584125,"fields":[{"name":"advertiserFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliateFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AdminReplenish","header":58961501,"fields":[]},
    {"name":"AdminModifyCampaignFeePercentage","header":1116890518,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"feePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AdminStopCampaign","header":1822632228,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdminResumeCampaign","header":460159264,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdminSeizeCampaignBalance","header":1433233099,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdminJettonNotificationMessageFailure","header":3769391455,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AdminWithdrawUSDTToPayout","header":2703619106,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AdminPayAffiliateUSDTBounced","header":1452035766,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AdvertiserWithdrawFundsEvent","header":3552449590,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"CampaignCreatedEvent","header":2452245169,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"campaignContractAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdvertiserSignedCampaignDetailsEvent","header":1529127575,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AffiliateCreatedEvent","header":2267067737,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"AdvertiserRemovedAffiliateEvent","header":1530383439,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdvertiserApprovedAffiliateListEvent","header":4109738705,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdvertiserDeployNewCampaign","header":1179651103,"fields":[]},
    {"name":"ParentToChildDeployCampaign","header":1292517596,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ParentToChildUpdateFeePercentage","header":2049922941,"fields":[{"name":"feePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"ParentToChildSeizeCampaign","header":340595563,"fields":[]},
    {"name":"ParentToChildJettonNotificationMessageFailure","header":1354800261,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"ParentToChildWithdrawUSDTToPayout","header":2232130989,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"ParentToChildPayAffiliateUSDTBounced","header":2591643766,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"BotUserAction","header":1940543113,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"userActionOpCode","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isPremiumUser","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"PayAffiliate","header":2310656706,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AffiliateCreateNewAffiliate","header":820291840,"fields":[]},
    {"name":"AffiliateWithdrawEarnings","header":2309430758,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AdvertiserWithdrawFunds","header":3579069153,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AdvertiserAddNewUserOpCode","header":237456654,"fields":[{"name":"userOpCode","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isPremiumUserOpCode","type":{"kind":"simple","type":"bool","optional":false}},{"name":"costPerAction","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"AdvertiserSetCampaignDetails","header":1253088072,"fields":[{"name":"campaignDetails","type":{"kind":"simple","type":"CampaignDetails","optional":false}}]},
    {"name":"AdvertiserUserAction","header":3231438857,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"userActionOpCode","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isPremiumUser","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"AdvertiserRemoveAffiliate","header":2637094481,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AdvertiserApproveAffiliate","header":1560570076,"fields":[{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AdvertiserReplenish","header":1319387318,"fields":[]},
    {"name":"AdvertiserReplenishGasFeesForUSDTCampaign","header":3170273034,"fields":[]},
    {"name":"AdvertiserSignOffWithdraw","header":2469363792,"fields":[{"name":"setAffiliatesWithdrawEarnings","type":{"kind":"dict","key":"int","value":"int"}}]},
    {"name":"ChildToParentCampaignDeployedSuccessfully","header":370750836,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChildToParentAffiliateCreated","header":3477708169,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"ChildToParentAdvertiserSignedCampaignDetails","header":1248894233,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChildToParentAdvertiserWithdrawFunds","header":2584288256,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"ChildToParentAdvertiserApprovedAffiliate","header":1498234406,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChildToParentAdvertiserRemovedAffiliate","header":2190513838,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"affiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"JettonTransferNotification","header":1935855772,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"forwardPayload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"TokenExcesses","header":3576854235,"fields":[{"name":"query_id","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"CampaignDetails","header":null,"fields":[{"name":"regularUsersCostPerAction","type":{"kind":"dict","key":"int","value":"int"}},{"name":"premiumUsersCostPerAction","type":{"kind":"dict","key":"int","value":"int"}},{"name":"isPublicCampaign","type":{"kind":"simple","type":"bool","optional":false}},{"name":"campaignValidForNumDays","type":{"kind":"simple","type":"uint","optional":true,"format":32}},{"name":"paymentMethod","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"requiresAdvertiserApprovalForWithdrawl","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"UserActionStats","header":null,"fields":[{"name":"numActions","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastUserActionTimestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AffiliateData","header":null,"fields":[{"name":"affiliate","type":{"kind":"simple","type":"address","optional":false}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"userActionsStats","type":{"kind":"dict","key":"int","value":"UserActionStats","valueFormat":"ref"}},{"name":"premiumUserActionsStats","type":{"kind":"dict","key":"int","value":"UserActionStats","valueFormat":"ref"}},{"name":"pendingApprovalEarnings","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalEarnings","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"withdrawEarnings","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"CampaignData","header":null,"fields":[{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"payout","type":{"kind":"simple","type":"address","optional":false}},{"name":"campaignDetails","type":{"kind":"simple","type":"CampaignDetails","optional":false}},{"name":"numAffiliates","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"totalAffiliateEarnings","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"campaignStartTimestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastUserActionTimestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserWithdrawls","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserSignOffs","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserReplenishCampaign","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserReplenishGasFees","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numUserActions","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"campaignBalance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"maxCpaValue","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"contractTonBalance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"contractAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"contractUSDTBalance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"contractUsdtWallet","type":{"kind":"simple","type":"address","optional":false}},{"name":"advertiserFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliateFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"campaignHasSufficientFundsToPayMaxCpa","type":{"kind":"simple","type":"bool","optional":false}},{"name":"isCampaignExpired","type":{"kind":"simple","type":"bool","optional":false}},{"name":"isCampaignPausedByAdmin","type":{"kind":"simple","type":"bool","optional":false}},{"name":"campaignHasSufficientTonToPayGasFees","type":{"kind":"simple","type":"bool","optional":false}},{"name":"isCampaignActive","type":{"kind":"simple","type":"bool","optional":false}},{"name":"topAffiliates","type":{"kind":"dict","key":"int","value":"int"}}]},
    {"name":"JettonWalletData","header":null,"fields":[{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":4}},{"name":"balance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"ownerAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Campaign$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"stopped","type":{"kind":"simple","type":"bool","optional":false}},{"name":"campaignId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"payout","type":{"kind":"simple","type":"address","optional":false}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"campaignDetails","type":{"kind":"simple","type":"CampaignDetails","optional":false}},{"name":"bot","type":{"kind":"simple","type":"address","optional":false}},{"name":"currAffiliateId","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"affiliates","type":{"kind":"dict","key":"int","value":"AffiliateData","valueFormat":"ref"}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"campaignStartTimestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastUserActionTimestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserWithdrawls","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserSignOffs","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserReplenishCampaign","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numAdvertiserReplenishGasFees","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"numUserActions","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"totalAffiliateEarnings","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"maxCpaValue","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"affiliateFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiserFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"topAffiliates","type":{"kind":"dict","key":"int","value":"int"}},{"name":"contractUSDTBalance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"contractUsdtWallet","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AffiliateMarketplace$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"stopped","type":{"kind":"simple","type":"bool","optional":false}},{"name":"bot","type":{"kind":"simple","type":"address","optional":false}},{"name":"numCampaigns","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"usdtMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"usdtWalletBytecode","type":{"kind":"simple","type":"cell","optional":false}},{"name":"affiliateFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"advertiserFeePercentage","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
]

const Campaign_getters: ABIGetter[] = [
    {"name":"campaignData","arguments":[],"returnType":{"kind":"simple","type":"CampaignData","optional":false}},
    {"name":"affiliateData","arguments":[{"name":"affiliateId","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"AffiliateData","optional":true}},
    {"name":"affiliatesData","arguments":[],"returnType":{"kind":"dict","key":"int","value":"AffiliateData","valueFormat":"ref"}},
    {"name":"affiliatesDataInRange","arguments":[{"name":"fromIdx","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"toIdx","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"dict","key":"int","value":"AffiliateData","valueFormat":"ref"}},
    {"name":"balance","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"stopped","arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"owner","arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
]

export const Campaign_getterMapping: { [key: string]: string } = {
    'campaignData': 'getCampaignData',
    'affiliateData': 'getAffiliateData',
    'affiliatesData': 'getAffiliatesData',
    'affiliatesDataInRange': 'getAffiliatesDataInRange',
    'balance': 'getBalance',
    'stopped': 'getStopped',
    'owner': 'getOwner',
}

const Campaign_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"ParentToChildDeployCampaign"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TokenExcesses"}},
    {"receiver":"internal","message":{"kind":"typed","type":"JettonTransferNotification"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AffiliateWithdrawEarnings"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserSignOffWithdraw"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ParentToChildSeizeCampaign"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserSetCampaignDetails"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserReplenish"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserReplenishGasFeesForUSDTCampaign"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AffiliateCreateNewAffiliate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserApproveAffiliate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserRemoveAffiliate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserWithdrawFunds"}},
    {"receiver":"internal","message":{"kind":"typed","type":"BotUserAction"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserAddNewUserOpCode"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AdvertiserUserAction"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ParentToChildJettonNotificationMessageFailure"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ParentToChildWithdrawUSDTToPayout"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ParentToChildPayAffiliateUSDTBounced"}},
    {"receiver":"internal","message":{"kind":"text","text":"Resume"}},
    {"receiver":"internal","message":{"kind":"text","text":"Stop"}},
]

export class Campaign implements Contract {
    
    static async init(owner: Address, campaignId: bigint, advertiser: Address, payout: Address, bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell, advertiserFeePercentage: bigint, affiliateFeePercentage: bigint) {
        return await Campaign_init(owner, campaignId, advertiser, payout, bot, usdtMasterAddress, usdtWalletBytecode, advertiserFeePercentage, affiliateFeePercentage);
    }
    
    static async fromInit(owner: Address, campaignId: bigint, advertiser: Address, payout: Address, bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell, advertiserFeePercentage: bigint, affiliateFeePercentage: bigint) {
        const init = await Campaign_init(owner, campaignId, advertiser, payout, bot, usdtMasterAddress, usdtWalletBytecode, advertiserFeePercentage, affiliateFeePercentage);
        const address = contractAddress(0, init);
        return new Campaign(address, init);
    }
    
    static fromAddress(address: Address) {
        return new Campaign(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Campaign_types,
        getters: Campaign_getters,
        receivers: Campaign_receivers,
        errors: Campaign_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: ParentToChildDeployCampaign | TokenExcesses | JettonTransferNotification | AffiliateWithdrawEarnings | AdvertiserSignOffWithdraw | ParentToChildSeizeCampaign | AdvertiserSetCampaignDetails | AdvertiserReplenish | AdvertiserReplenishGasFeesForUSDTCampaign | AffiliateCreateNewAffiliate | AdvertiserApproveAffiliate | AdvertiserRemoveAffiliate | AdvertiserWithdrawFunds | BotUserAction | AdvertiserAddNewUserOpCode | AdvertiserUserAction | ParentToChildJettonNotificationMessageFailure | ParentToChildWithdrawUSDTToPayout | ParentToChildPayAffiliateUSDTBounced | 'Resume' | 'Stop') {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ParentToChildDeployCampaign') {
            body = beginCell().store(storeParentToChildDeployCampaign(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TokenExcesses') {
            body = beginCell().store(storeTokenExcesses(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'JettonTransferNotification') {
            body = beginCell().store(storeJettonTransferNotification(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AffiliateWithdrawEarnings') {
            body = beginCell().store(storeAffiliateWithdrawEarnings(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserSignOffWithdraw') {
            body = beginCell().store(storeAdvertiserSignOffWithdraw(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ParentToChildSeizeCampaign') {
            body = beginCell().store(storeParentToChildSeizeCampaign(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserSetCampaignDetails') {
            body = beginCell().store(storeAdvertiserSetCampaignDetails(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserReplenish') {
            body = beginCell().store(storeAdvertiserReplenish(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserReplenishGasFeesForUSDTCampaign') {
            body = beginCell().store(storeAdvertiserReplenishGasFeesForUSDTCampaign(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AffiliateCreateNewAffiliate') {
            body = beginCell().store(storeAffiliateCreateNewAffiliate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserApproveAffiliate') {
            body = beginCell().store(storeAdvertiserApproveAffiliate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserRemoveAffiliate') {
            body = beginCell().store(storeAdvertiserRemoveAffiliate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserWithdrawFunds') {
            body = beginCell().store(storeAdvertiserWithdrawFunds(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'BotUserAction') {
            body = beginCell().store(storeBotUserAction(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserAddNewUserOpCode') {
            body = beginCell().store(storeAdvertiserAddNewUserOpCode(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AdvertiserUserAction') {
            body = beginCell().store(storeAdvertiserUserAction(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ParentToChildJettonNotificationMessageFailure') {
            body = beginCell().store(storeParentToChildJettonNotificationMessageFailure(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ParentToChildWithdrawUSDTToPayout') {
            body = beginCell().store(storeParentToChildWithdrawUSDTToPayout(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ParentToChildPayAffiliateUSDTBounced') {
            body = beginCell().store(storeParentToChildPayAffiliateUSDTBounced(message)).endCell();
        }
        if (message === 'Resume') {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message === 'Stop') {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getCampaignData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('campaignData', builder.build())).stack;
        const result = loadGetterTupleCampaignData(source);
        return result;
    }
    
    async getAffiliateData(provider: ContractProvider, affiliateId: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(affiliateId);
        let source = (await provider.get('affiliateData', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleAffiliateData(result_p) : null;
        return result;
    }
    
    async getAffiliatesData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('affiliatesData', builder.build())).stack;
        let result = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserAffiliateData(), source.readCellOpt());
        return result;
    }
    
    async getAffiliatesDataInRange(provider: ContractProvider, fromIdx: bigint, toIdx: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(fromIdx);
        builder.writeNumber(toIdx);
        let source = (await provider.get('affiliatesDataInRange', builder.build())).stack;
        let result = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserAffiliateData(), source.readCellOpt());
        return result;
    }
    
    async getBalance(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('balance', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getStopped(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('stopped', builder.build())).stack;
        let result = source.readBoolean();
        return result;
    }
    
    async getOwner(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('owner', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }
    
}