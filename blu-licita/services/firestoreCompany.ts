import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../services/firebase";

export const listCompanyDocs = async <T,>(collectionName: string, companyId: string): Promise<Array<T & { id: string }>> => {
  const snapshot = await getDocs(query(collection(db, collectionName), where("companyId", "==", companyId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T & { id: string }));
};

export const createCompanyDoc = async (collectionName: string, companyId: string, userId: string, value: Record<string, unknown>) => {
  const now = new Date().toISOString();
  return addDoc(collection(db, collectionName), {
    ...value,
    companyId,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  });
};

export const updateCompanyDoc = async (collectionName: string, id: string, userId: string, value: Record<string, unknown>) => {
  return updateDoc(doc(db, collectionName, id), {
    ...value,
    updatedBy: userId,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteCompanyDoc = async (collectionName: string, id: string) => deleteDoc(doc(db, collectionName, id));
