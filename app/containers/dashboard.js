// @flow

import { connect } from 'react-redux';
import eres from 'eres';
import flow from 'lodash.flow';
import groupBy from 'lodash.groupby';
import dateFns from 'date-fns';
import { BigNumber } from 'bignumber.js';

import { DashboardView } from '../views/dashboard';

import rpc from '../../services/api';
import store from '../../config/electron-store';
import { SAPLING, MIN_CONFIRMATIONS_NUMBER } from '../constants/anon-network';
import { NODE_SYNC_TYPES } from '../constants/node-sync-types';
import { listShieldedTransactions } from '../../services/shielded-transactions';
import { sortByDescend } from '../utils/sort-by-descend';

import {
  loadWalletSummary,
  loadWalletSummarySuccess,
  loadWalletSummaryError,
} from '../redux/modules/wallet';

import type { AppState } from '../types/app-state';
import type { Dispatch } from '../types/redux';

const mapStateToProps = ({ walletSummary, app }: AppState) => ({
  total: walletSummary.total,
  shielded: walletSummary.shielded,
  transparent: walletSummary.transparent,
  unconfirmed: walletSummary.unconfirmed,
  error: walletSummary.error,
  isLoading: walletSummary.isLoading,
  anonPrice: walletSummary.anonPrice,
  addresses: walletSummary.addresses,
  transactions: walletSummary.transactions,
  isDaemonReady: app.nodeSyncType === NODE_SYNC_TYPES.READY,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  getSummary: async () => {
    dispatch(loadWalletSummary());

    const [walletErr, walletSummary] = await eres(rpc.z_gettotalbalance());
    const [zAddressesErr, zAddresses = []] = await eres(rpc.z_listaddresses());
    const [tAddressesErr, tAddresses = []] = await eres(rpc.getaddressesbyaccount(''));
    const [transactionsErr, transactions] = await eres(rpc.listtransactions('', 1000, 0));
    const [unconfirmedBalanceErr, unconfirmedBalance] = await eres(rpc.getunconfirmedbalance());

    if (walletErr || zAddressesErr || tAddressesErr || transactionsErr || unconfirmedBalanceErr) {
      return dispatch(
        loadWalletSummaryError({
          error: 'Something went wrong!',
        }),
      );
    }

    const transfilter = transactions.filter(t => t.category === 'receive' || t.category === 'send')

    const formattedTransactions: Array<Object> = flow([
      arr => arr.map(transaction => ({
        confirmed: transaction.confirmations >= MIN_CONFIRMATIONS_NUMBER,
        confirmations: transaction.confirmations,
        transactionId: transaction.txid,
        type: transaction.category,
        date: new Date(transaction.time * 1000).toISOString(),
        address: transaction.address || '(Shielded)',
        amount: Math.abs(transaction.amount),
        fees: transaction.fee ? new BigNumber(transaction.fee).abs().toFormat(4) : 'N/A',
      })),
      arr => groupBy(arr, obj => dateFns.format(obj.date, 'MMM DD, YYYY')),
      obj => Object.keys(obj).map(day => ({
        day,
        jsDay: new Date(day),
        list: sortByDescend('date')(obj[day]),
      })),
      sortByDescend('jsDay'),
    ])([...transfilter, ...await listShieldedTransactions()]);

    if (!zAddresses.length) {
      const [, newZAddress] = await eres(rpc.z_getnewaddress());

      if (newZAddress) zAddresses.push(newZAddress);
    }

    if (!tAddresses.length) {
      const [, newTAddress] = await eres(rpc.getnewaddress(''));

      if (newTAddress) tAddresses.push(newTAddress);
    }

    dispatch(
      loadWalletSummarySuccess({
        transparent: walletSummary.transparent,
        total: walletSummary.total,
        shielded: walletSummary.private,
        unconfirmed: unconfirmedBalance,
        addresses: [...zAddresses, ...tAddresses],
        transactions: formattedTransactions,
        anonPrice: new BigNumber(store.get('ANON_DOLLAR_PRICE')).toNumber(),
      }),
    );
  },
});

// $FlowFixMe
export const DashboardContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DashboardView);
