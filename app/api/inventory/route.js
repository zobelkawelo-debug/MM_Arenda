import { NextResponse } from 'next/server';

// Сюда вставляем ваш ID развертывания
const GAS_URL = "https://script.google.com/macros/s/AKfycbzRgX1ozxSvcGSrWIgvHqKZNca8Sw1COw_Ro3XgC1DlX9VbwihzbCLfl6pEP1R27Hg/exec";

export async function GET() {
  try {
    // Делаем запрос с сервера Next.js, разрешая редиректы (Google их использует)
    const response = await fetch(GAS_URL, { 
      redirect: 'follow',
      // Отключаем кэширование, чтобы всегда получать свежие остатки
      cache: 'no-store' 
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка Google Apps Script: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Ошибка API инвентаря:", error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}