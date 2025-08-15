import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  import type { RFQ, User, Quote } from './types';
  
  // RFQ Operations
  export const createRFQ = async (rfqData: Omit<RFQ, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'rfqs'), {
        ...rfqData,
        inquiryTime: Timestamp.fromDate(new Date(rfqData.inquiryTime)),
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating RFQ:', error);
      throw error;
    }
  };
  
  export const getRFQs = async (): Promise<RFQ[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'rfqs'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        inquiryTime: doc.data().inquiryTime?.toDate?.()?.toISOString() || doc.data().inquiryTime
      } as RFQ));
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      return [];
    }
  };
  
  export const getRFQById = async (id: string): Promise<RFQ | null> => {
    try {
      const docRef = doc(db, 'rfqs', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          inquiryTime: data.inquiryTime?.toDate?.()?.toISOString() || data.inquiryTime
        } as RFQ;
      }
      return null;
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      return null;
    }
  };
  
  export const updateRFQ = async (id: string, updates: Partial<RFQ>): Promise<void> => {
    try {
      const docRef = doc(db, 'rfqs', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating RFQ:', error);
      throw error;
    }
  };
  
  // User Operations
  export const getUsers = async (): Promise<User[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };
  
  export const getUserByEmail = async (email: string): Promise<User | null> => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };