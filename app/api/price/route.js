import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL не предоставлен' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`Сайт недоступен: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Пытаемся найти цену тремя разными способами:
    // 1. Через микроразметку (самый надежный способ)
    let priceText = $('[itemprop="price"]').attr('content');
    
    // 2. Через класс .price или аналогичные (если микроразметки нет)
    if (!priceText) priceText = $('.ty-price-num, .price, .product-price').first().text();
    
    // 3. Поиск по атрибуту data-price
    if (!priceText) priceText = $('[data-price]').attr('data-price');

    if (!priceText) return NextResponse.json({ error: 'Не удалось найти цену на странице' }, { status: 404 });

    // Очищаем: убираем пробелы, буквы, меняем запятую на точку
    const cleanPrice = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));

    return NextResponse.json({ price: cleanPrice, url });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}