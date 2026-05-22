"use client";

import {
  collection,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase-client";
import {
  COLLECTIONS,
  type Account,
  type Card,
  type Email,
  type LimitRequest,
  type MerchantLock,
  type Transaction,
  type User,
  type WithId,
} from "./types";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/** Subscribe to users/{uid}. */
export function useUserDoc(uid: string | undefined): QueryState<User> {
  const [state, setState] = useState<QueryState<User>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    return onSnapshot(
      doc(db, COLLECTIONS.users, uid),
      (snap) => {
        setState({
          data: snap.exists() ? (snap.data() as User) : null,
          loading: false,
          error: null,
        });
      },
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/** Subscribe to the user's primary account (first one found). */
export function usePrimaryAccount(
  uid: string | undefined,
): QueryState<WithId<Account>> {
  const [state, setState] = useState<QueryState<WithId<Account>>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.accounts),
      where("user_id", "==", uid),
      fsLimit(1),
    );
    return onSnapshot(
      q,
      (snap) => {
        const first = snap.docs[0];
        setState({
          data: first ? ({ id: first.id, ...(first.data() as Account) }) : null,
          loading: false,
          error: null,
        });
      },
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/**
 * Subscribe to the user's transactions, newest first. Pass `limit` to cap
 * the result set (e.g. 3 for the home strip).
 */
export function useTransactions(
  uid: string | undefined,
  limit?: number,
): ListState<WithId<Transaction>> {
  const [state, setState] = useState<ListState<WithId<Transaction>>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const constraints: QueryConstraint[] = [
      where("user_id", "==", uid),
      orderBy("posted_at", "desc"),
    ];
    if (limit && limit > 0) constraints.push(fsLimit(limit));
    const q = query(collection(db, COLLECTIONS.transactions), ...constraints);

    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Transaction),
        }));
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid, limit]);

  return state;
}

/** Subscribe to a single transaction by id. */
export function useTransaction(
  txId: string | undefined,
): QueryState<WithId<Transaction>> {
  const [state, setState] = useState<QueryState<WithId<Transaction>>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!txId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    return onSnapshot(
      doc(db, COLLECTIONS.transactions, txId),
      (snap) => {
        setState({
          data: snap.exists()
            ? { id: snap.id, ...(snap.data() as Transaction) }
            : null,
          loading: false,
          error: null,
        });
      },
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [txId]);

  return state;
}

/** Subscribe to the user's cards. */
export function useCards(
  uid: string | undefined,
): ListState<WithId<Card>> {
  const [state, setState] = useState<ListState<WithId<Card>>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.cards),
      where("user_id", "==", uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Card),
        }));
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/** Subscribe to the user's emails, newest first. */
export function useEmails(
  uid: string | undefined,
): ListState<WithId<Email>> {
  const [state, setState] = useState<ListState<WithId<Email>>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.emails),
      where("user_id", "==", uid),
      orderBy("sent_at", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Email),
        }));
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/** Subscribe to the user's merchant_locks. */
export function useMerchantLocks(
  uid: string | undefined,
): ListState<WithId<MerchantLock>> {
  const [state, setState] = useState<ListState<WithId<MerchantLock>>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.merchant_locks),
      where("user_id", "==", uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MerchantLock),
        }));
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/** Subscribe to the user's pending + decided limit requests. */
export function useLimitRequests(
  uid: string | undefined,
): ListState<WithId<LimitRequest>> {
  const [state, setState] = useState<ListState<WithId<LimitRequest>>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.limit_requests),
      where("user_id", "==", uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as LimitRequest),
        }));
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid]);

  return state;
}

/** Subscribe to a single card by id. */
export function useCard(
  cardId: string | undefined,
): QueryState<WithId<Card>> {
  const [state, setState] = useState<QueryState<WithId<Card>>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!cardId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    return onSnapshot(
      doc(db, COLLECTIONS.cards, cardId),
      (snap) => {
        setState({
          data: snap.exists()
            ? { id: snap.id, ...(snap.data() as Card) }
            : null,
          loading: false,
          error: null,
        });
      },
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [cardId]);

  return state;
}
