import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
    getCategories,
    createCategory,
    updateCategory as updateCategoryAPI,
    deleteCategory as deleteCategoryAPI,
} from '../services/categoryService';

// 1. Context 생성
const CategoryContext = createContext();

// 2. Provider 컴포넌트 생성
export const CategoryProvider = ({ children }) => {
    const { getToken } = useAuth(); // Clerk에서 토큰 가져오기

    // 상태 관리
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 컴포넌트 마운트 시 카테고리 로드
    useEffect(() => {
        loadCategories();
    }, []);

    // 카테고리 로드 함수
    const loadCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getCategories(token);
            setCategories(data);
        } catch (error) {
            console.error('카테고리 로딩 실패:', error);
            setError(error.message);
        } finally {
            setLoading(false); // 성공/실패 관계없이 항상 실행
        }
    };

    // 카테고리 추가 함수
    const addCategory = async (categoryData) => {
        try {
            const token = await getToken();
            const newCategory = await createCategory(token, categoryData);

            // 상태에 새 카테고리 추가
            setCategories([...categories, newCategory]);

            return newCategory;
        } catch (error) {
            console.error('카테고리 생성 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // 카테고리 수정 함수
    const updateCategory = async (categoryId, categoryData) => {
        try {
            const token = await getToken();
            const updatedCategory = await updateCategoryAPI(token, categoryId, categoryData);

            // 상태에서 해당 카테고리만 업데이트
            setCategories(categories.map(cat => cat.id === categoryId ? updatedCategory : cat));

            return updatedCategory;
        } catch (error) {
            console.error('카테고리 수정 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // 카테고리 삭제 함수
    const deleteCategory = async (categoryId) => {
        try {
            const token = await getToken();
            await deleteCategoryAPI(token, categoryId);

            // 상태에서 해당 카테고리 제거
            setCategories(categories.filter(cat => cat.id !== categoryId));
        } catch (error) {
            console.error('카테고리 삭제 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    }

    // Context에 제공할 값
    const value = {
        categories, // 카테고리 목록
        loading, // 로딩 상태
        error, // 에러 상태
        loadCategories, // 카테고리 로드
        addCategory, // 카테고리 추가
        updateCategory, // 카테고리 수정
        deleteCategory, // 카테고리 삭제
    };

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
};

// 3. Custom Hook
export const useCategories = () => {
    const context = useContext(CategoryContext);

    // Provider 밖에서 사용하면 에러
    if (!context) {
        throw new Error('useCategory must be used within a CategoryProvider');
    }
    return context;
}


// 4. Provider 내보내기
export default CategoryProvider;