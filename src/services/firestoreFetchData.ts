import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * 'indirim_ilanlari' koleksiyonundaki verileri bir liste olarak döner.
 */
export async function getIndirimIlanlari(): Promise<any[]> {
    try {
        const colRef = collection(db, 'indirim_ilanlari');
        const snapshot = await getDocs(colRef);

        const dataList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return dataList;
    } catch (error) {
        console.error('Error fetching indirim_ilanlari:', error);
        throw error;
    }
}

/**
 * 'taksiler' koleksiyonundaki verileri bir liste olarak döner.
 */
export async function getTaksiler(): Promise<any[]> {
    try {
        const colRef = collection(db, 'taksiler');
        const snapshot = await getDocs(colRef);

        const dataList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return dataList;
    } catch (error) {
        console.error('Error fetching taksiler:', error);
        throw error;
    }
}
