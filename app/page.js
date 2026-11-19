"use client";

import { useState, useEffect } from "react";

export default function RentApp() {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzRgX1ozxSvcGSrWIgvHqKZNca8Sw1COw_Ro3XgC1DlX9VbwihzbCLfl6pEP1R27Hg/exec";

  // --- АВТОРИЗАЦИЯ И БД ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [inventory, setInventory] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // --- СОСТОЯНИЯ ФОРМЫ ---
  const [contractNumber, setContractNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationText, setDurationText] = useState("");
  const [manualTotal, setManualTotal] = useState("");

  const [isBuyout, setIsBuyout] = useState(false);
  const [buyoutTotal, setBuyoutTotal] = useState("0.00");
  const [passport, setPassport] = useState({
    series: "", date: "", issuedBy: "", personalNumber: "", address: "", phone: ""
  });

  const [products, setProducts] = useState([
    { name: "", serial: "", kit: "", retailPrice: "", priceDay: "", priceMonth: "" }
  ]);

  // --- МОДАЛКИ ---
  const [extendModal, setExtendModal] = useState({
    isOpen: false, contractNumber: '', addDays: '', addSum: '',
    isFound: false, clientName: '', productsStr: '', dailyRate: 0, monthlyRate: 0
  });
  const [returnModal, setReturnModal] = useState({ isOpen: false, contractNumber: '' });
  const [reportModal, setReportModal] = useState({ isOpen: false, data: [], loading: false, searchQuery: '' });

  // Генерация номера договора при загрузке
  const generateNewContractNumber = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    setContractNumber(`${yy}${mm}-${rand}`);
  };

  useEffect(() => {
    generateNewContractNumber();
  }, []);

  // Загрузка базы инструментов
  const loadInventory = () => {
    setIsLoadingDB(true);
    fetch("/api/inventory")
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') setInventory(res.data);
        setIsLoadingDB(false);
      })
      .catch(() => setIsLoadingDB(false));
  };

  useEffect(() => {
    if (isLoggedIn) loadInventory();
  }, [isLoggedIn]);

  // Расчет сроков и сумм
  useEffect(() => {
    if (!startDate || !endDate) {
      setDurationText("");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      setDurationText("Некорректные даты");
      return;
    }

    const months = Math.floor(days / 30);
    const remainDays = days % 30;

    let textParts = [];
    if (months > 0) textParts.push(`${months} мес.`);
    if (remainDays > 0) textParts.push(`${remainDays} дн.`);
    setDurationText(textParts.join(" + "));

    let calculatedSum = 0;
    products.forEach(p => {
      const pDay = parseFloat(p.priceDay) || 0;
      const pMonth = parseFloat(p.priceMonth) || 0;
      calculatedSum += (months * pMonth) + (remainDays * pDay);
    });

    let calculatedBuyout = 0;
    if (isBuyout && months > 0) {
      products.forEach(p => {
        const retail = parseFloat(p.retailPrice) || 0;
        calculatedBuyout += (retail * 0.05) * months;
      });
    }

    setManualTotal(calculatedSum.toFixed(2));
    setBuyoutTotal(calculatedBuyout.toFixed(2));
  }, [startDate, endDate, products, isBuyout]);

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const applyPreset = (daysToAdd) => {
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) setStartDate(formatDate(start));

    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    setEndDate(formatDate(end));
  };

  const handleProductChange = (index, value) => {
    const newProducts = [...products];
    newProducts[index].name = value;

    const matched = inventory.find(item => item.name === value);
    if (matched) {
      newProducts[index].serial = matched.serial || "";
      newProducts[index].kit = matched.kit || "";
      newProducts[index].retailPrice = matched.retailPrice || "";
      newProducts[index].priceDay = matched.priceDay || "";
      newProducts[index].priceMonth = matched.priceMonth || "";
    }
    setProducts(newProducts);
  };

  const updateProductField = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        alert("Неверный логин или пароль");
      }
    } catch {
      alert("Ошибка проверки пароля");
    }
  };

  // --- ГЕНЕРАЦИЯ ДОГОВОРА И АКТОВ ---
  const generateDocument = async (type) => {
    try {
      const formatRu = (dateStr) => dateStr ? dateStr.split('-').reverse().join('.') : '';
      const totalRetail = products.reduce((sum, p) => sum + (parseFloat(p.retailPrice) || 0), 0).toFixed(2);

      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const months = Math.floor(days / 30);
      const remainDays = days % 30;

      const nameParts = clientName.trim().split(' ');
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';
      const secondName = nameParts[2] || '';

      const documentData = {
        DocumentNumber: contractNumber,
        ClientName: clientName,
        PassportSeries: passport.series,
        PassportIssuedBy: passport.issuedBy,
        PassportDate: formatRu(passport.date),
        PersonalNumber: passport.personalNumber,
        ClientAddress: passport.address,
        ClientPhone: passport.phone,
        StartDate: formatRu(startDate),
        EndDate: formatRu(endDate),
        RetailPrice: totalRetail,
        TotalSum: manualTotal,

        UfCrm1695753575310: formatRu(startDate),
        DocumentCreateTime: type === 'act_in' ? formatRu(endDate || startDate) : formatRu(startDate),
        ContactLastName: lastName,
        ContactName: firstName,
        ContactSecondName: secondName,
        ContactUfCrm1695732915141: passport.series,
        ContactUfCrm1695733035565: formatRu(passport.date),
        ContactUfCrm1695732935165: passport.issuedBy,
        ContactUfCrm1695734833035: passport.personalNumber,
        ContactRequisiteHomeAddressText: passport.address,
        ContactPhone: passport.phone,
        MyCompanyTitle: 'Частное унитарное предприятие «МьюзикМаркет»',
        MyCompanyRequisiteRqInn: '193642648',
        MyCompanyAddressLegal: 'ул.Короля, д20, 220004, г.Минск',
        MyCompanyBankDetailRqBankName: 'ОАО «Банк Дабрабыт»',
        MyCompanyBankDetailRqBankAddr: 'г. Минск, ул. Коммунистическая, д.49',
        MyCompanyBankDetailRqBik: 'MMBNBY22',
        MyCompanyBankDetailRqAccNum: 'BY45MMBN30120000010102275117',
        MyCompanyPhone: '+375 29 680-33-44',
        MyCompanyEmail: 'rent@musicmarket.by',

        products: products.map((p, i) => {
          const pDay = parseFloat(p.priceDay) || 0;
          const pMonth = parseFloat(p.priceMonth) || 0;
          const rowSum = (months * pMonth) + (remainDays * pDay);
          const finalRowSum = rowSum > 0 ? rowSum : (pMonth || pDay);
          const vatSum = (finalRowSum * 20 / 120).toFixed(2);
          const termText = months > 0 && remainDays === 0 ? `${months}` : `${days} дн.`;

          return {
            Index: i + 1,
            Name: `${p.name || 'Товар'} ${p.kit ? `(${p.kit})` : ''}`.trim(),
            Price: (pMonth || pDay).toFixed(2),
            Months: termText,
            VatSum: vatSum,

            ProductsIndex: i + 1,
            ProductsProductName: p.name,
            ProductsProductProperty220: p.serial || 'б/н',
            ProductsProductProperty222: p.kit || 'Стандарт',
            ProductsProductProperty218: p.retailPrice,
            ProductsProductPriceRawNetto: (pMonth || pDay).toFixed(2),
            ProductsProductQuantity: termText,
            ProductsProductDiscountRate: '20',
            ProductsProductDiscountTotal: vatSum,
            ProductsProductPriceSum: finalRowSum.toFixed(2),
            UfCrm1695742168081: formatRu(endDate),

            TotalSum: finalRowSum.toFixed(2)
          };
        })
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType: type, data: documentData }),
      });

      if (!response.ok) throw new Error("Ошибка генерации файла");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'contract' ? `Договор_${contractNumber}_${clientName}.docx`
                 : type === 'act_out' ? `Акт_выдачи_${contractNumber}_${clientName}.docx`
                 : `Акт_возврата_${contractNumber}_${clientName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      if (type === 'contract') {
        const gasPayload = {
          action: 'create',
          contractNumber: contractNumber,
          startDate: documentData.StartDate,
          endDate: documentData.EndDate,
          clientName: clientName,
          phone: passport.phone,
          products: products,
          manualTotal: manualTotal
        };

        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(gasPayload)
        });
        alert(`Договор № ${contractNumber} сгенерирован и записан в базу!`);
        setTimeout(loadInventory, 1500);
      }
    } catch (err) {
      alert("Произошла ошибка: " + err.message);
    }
  };

  // --- ПРОДЛЕНИЕ ---
  const searchContractForExtension = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getContract&number=${encodeURIComponent(extendModal.contractNumber)}`);
      const data = await res.json();

      if (data.status === 'success') {
        let dRate = 0;
        let mRate = 0;

        inventory.forEach(invItem => {
          if (data.products.includes(invItem.name)) {
            dRate += parseFloat(invItem.priceDay) || 0;
            mRate += parseFloat(invItem.priceMonth) || 0;
          }
        });

        setExtendModal({
          ...extendModal, isFound: true, clientName: data.clientName,
          productsStr: data.products, dailyRate: dRate, monthlyRate: mRate
        });
      } else {
        alert("Договор с таким номером не найден!");
      }
    } catch {
      alert("Ошибка при поиске договора.");
    }
  };

  const applyExtension = (type) => {
    if (type === 'day') {
      setExtendModal({ ...extendModal, addDays: 1, addSum: extendModal.dailyRate.toFixed(2) });
    } else if (type === 'week') {
      setExtendModal({ ...extendModal, addDays: 7, addSum: (extendModal.dailyRate * 7).toFixed(2) });
    } else if (type === 'month') {
      setExtendModal({ ...extendModal, addDays: 30, addSum: extendModal.monthlyRate.toFixed(2) });
    }
  };

  const handleExtendSubmit = async () => {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'extend',
          contractNumber: extendModal.contractNumber,
          addDays: extendModal.addDays,
          addSum: extendModal.addSum
        })
      });
      alert("Договор продлен, дата сдачи и сумма обновлены!");
      setExtendModal({ isOpen: false, contractNumber: '', addDays: '', addSum: '', isFound: false, clientName: '', productsStr: '', dailyRate: 0, monthlyRate: 0 });
    } catch {
      alert("Ошибка продления");
    }
  };

  // --- ВОЗВРАТ ---
  const handleReturnSubmit = async () => {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'return',
          contractNumber: returnModal.contractNumber
        })
      });
      alert("Инструменты приняты, договор закрыт!");
      setReturnModal({ isOpen: false, contractNumber: '' });
      setTimeout(loadInventory, 1500);
    } catch {
      alert("Ошибка закрытия договора");
    }
  };

  // --- ОТЧЕТ ---
  const handleOpenReport = async () => {
    setReportModal(prev => ({ ...prev, isOpen: true, loading: true }));
    try {
      const res = await fetch(`${GAS_URL}?action=getReport`);
      const json = await res.json();
      if (json.status === 'success') {
        setReportModal({ isOpen: true, data: json.data, loading: false, searchQuery: '' });
      }
    } catch {
      alert("Ошибка загрузки отчета");
      setReportModal(prev => ({ ...prev, loading: false }));
    }
  };

  const downloadCSV = (filteredData) => {
    const BOM = "\uFEFF";
    const headers = "Номер;Дата выдачи;Дата сдачи;ФИО;Инструмент;Сумма;Статус\n";
    const rows = filteredData.map(r =>
      `${r.contractNumber};${r.startDate};${r.endDate};${r.clientName};"${r.products}";${r.total};${r.status}`
    ).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Отчет_Аренда_${new Date().toLocaleDateString('ru-RU')}.csv`;
    link.click();
  };

  // --- ЭКРАН ВХОДА ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center">MusicMarket Аренда</h2>
          <input type="text" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} className="w-full p-2 border mb-4 rounded" />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border mb-4 rounded" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-bold">Войти</button>
        </form>
      </div>
    );
  }

  // --- ГЛАВНЫЙ ИНТЕРФЕЙС ---
  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Договор №</h2>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="border-2 border-blue-200 rounded px-2 py-1 font-bold text-lg w-32 text-blue-700"
            />
            <button
              type="button"
              onClick={generateNewContractNumber}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1.5 rounded font-medium"
              title="Сгенерировать новый номер"
            >
              Новый №
            </button>
          </div>
          {isLoadingDB ? (
            <span className="text-blue-500 text-sm animate-pulse">Синхронизация БД...</span>
          ) : (
            <span className="text-green-600 text-sm font-bold">✓ Свободно: {inventory.length} поз.</span>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">ФИО клиента</label>
          <input type="text" placeholder="Иванов Иван Иванович" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-2 border rounded" />
        </div>

        {/* РЕКВИЗИТЫ */}
        <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
          <h3 className="font-bold text-sm mb-3">Реквизиты Арендатора</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-xs text-gray-500">Паспорт (серия, номер)</span>
              <input type="text" value={passport.series} onChange={(e) => setPassport({ ...passport, series: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="МС 1234567" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Личный номер</span>
              <input type="text" value={passport.personalNumber} onChange={(e) => setPassport({ ...passport, personalNumber: e.target.value })} className="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Дата выдачи</span>
              <input type="date" value={passport.date} onChange={(e) => setPassport({ ...passport, date: e.target.value })} className="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Кем выдан</span>
              <input type="text" value={passport.issuedBy} onChange={(e) => setPassport({ ...passport, issuedBy: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="РУВД Московского р-на" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500">Адрес регистрации</span>
              <input type="text" value={passport.address} onChange={(e) => setPassport({ ...passport, address: e.target.value })} className="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Мобильный телефон</span>
              <input type="text" value={passport.phone} onChange={(e) => setPassport({ ...passport, phone: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="+375 (29) 000-00-00" />
            </div>
          </div>
        </div>

        {/* ДАТЫ */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Дата выдачи</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Плановый возврат</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-500 py-1 mr-2">Быстрый выбор:</span>
            <button type="button" onClick={() => applyPreset(1)} className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">1 сутки</button>
            <button type="button" onClick={() => applyPreset(2)} className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">2 суток</button>
            <button type="button" onClick={() => applyPreset(3)} className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">3 суток</button>
            <button type="button" onClick={() => applyPreset(7)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">1 неделя</button>
            <button type="button" onClick={() => applyPreset(14)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">2 недели</button>
            <button type="button" onClick={() => applyPreset(30)} className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded text-xs hover:bg-green-200">1 месяц</button>
            <button type="button" onClick={() => applyPreset(60)} className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded text-xs hover:bg-green-200">2 месяца</button>
          </div>
        </div>

        {/* ТОВАРЫ */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Оборудование</label>
          <datalist id="inventory-list">
            {inventory.map((item, i) => (
              <option key={i} value={item.name}>{item.warehouse} | С/Н: {item.serial || 'б/н'}</option>
            ))}
          </datalist>

          {products.map((prod, index) => (
            <div key={index} className="mb-4 p-3 border rounded-lg bg-gray-50">
              <input
                list="inventory-list"
                type="text"
                placeholder="Начните вводить название из базы..."
                value={prod.name}
                onChange={(e) => handleProductChange(index, e.target.value)}
                className="w-full p-2 border rounded-md bg-white font-medium mb-3"
              />

              <div className="grid grid-cols-5 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Серийный №</span>
                  <input type="text" value={prod.serial} onChange={(e) => updateProductField(index, "serial", e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white" placeholder="б/н" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Комплект</span>
                  <input type="text" value={prod.kit} onChange={(e) => updateProductField(index, "kit", e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white" placeholder="-" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Оценочная</span>
                  <input type="number" value={prod.retailPrice} onChange={(e) => updateProductField(index, "retailPrice", e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white text-right" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">В сутки</span>
                  <input type="number" value={prod.priceDay} onChange={(e) => updateProductField(index, "priceDay", e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white text-right font-semibold" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">В месяц</span>
                  <input type="number" value={prod.priceMonth} onChange={(e) => updateProductField(index, "priceMonth", e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white text-right font-semibold text-blue-700" />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setProducts([...products, { name: "", serial: "", kit: "", retailPrice: "", priceDay: "", priceMonth: "" }])}
            className="text-blue-600 text-sm font-bold mt-1 hover:underline"
          >
            + Добавить позицию
          </button>
        </div>

        {/* ИТОГО И ВЫКУП */}
        <div className="mt-6">
          <label className="flex items-center gap-2 cursor-pointer mb-3 p-3 bg-blue-50 text-blue-800 rounded border border-blue-200">
            <input type="checkbox" checked={isBuyout} onChange={(e) => setIsBuyout(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
            <span className="font-bold text-sm">Договор с правом выкупа инструмента (5% в месяц)</span>
          </label>

          <div className="p-5 bg-gray-100 rounded-lg border-2 border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">Срок аренды:</p>
              <p className="font-bold text-blue-700 text-lg">
                {durationText || <span className="text-gray-400 font-normal">Даты не выбраны</span>}
              </p>
              {isBuyout && parseFloat(buyoutTotal) > 0 && (
                <p className="text-sm text-orange-600 font-bold mt-2">
                  Кэшбек в счет выкупа: +{buyoutTotal} BYN
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Итоговая сумма (BYN):</p>
              <input
                type="number"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                className="text-3xl font-black text-green-600 bg-white border-2 border-green-200 rounded p-1 w-32 text-right"
              />
            </div>
          </div>
        </div>

        {/* ПЕЧАТЬ ДОКУМЕНТОВ */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6 border-2 border-dashed border-gray-300">
          <p className="text-center text-gray-500 font-bold text-sm mb-3">Печать пакета документов (№ {contractNumber})</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => generateDocument('contract')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-bold shadow-md transition-colors text-sm"
            >
              1. Договор (+ в базу)
            </button>
            <button
              type="button"
              onClick={() => generateDocument('act_out')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold shadow-md transition-colors text-sm"
            >
              2. Акт выдачи
            </button>
            <button
              type="button"
              onClick={() => generateDocument('act_in')}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg font-bold shadow-md transition-colors text-sm"
            >
              3. Акт возврата
            </button>
          </div>
        </div>

        {/* УПРАВЛЕНИЕ АРЕНДАМИ И ОТЧЕТ */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => setExtendModal({ ...extendModal, isOpen: true })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-lg font-bold shadow-md transition text-sm"
          >
            Продлить аренду
          </button>
          <button
            type="button"
            onClick={() => setReturnModal({ ...returnModal, isOpen: true })}
            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white p-3.5 rounded-lg font-bold shadow-md transition text-sm"
          >
            Принять возврат
          </button>
          <button
            type="button"
            onClick={handleOpenReport}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-3.5 rounded-lg font-bold shadow-md transition text-sm"
          >
            Отчет (CSV)
          </button>
        </div>
      </div>

      {/* МОДАЛКА ПРОДЛЕНИЯ */}
      {extendModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 text-black">
            <h3 className="text-xl font-bold mb-4">Продлить договор</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text" placeholder="Номер (напр. 2611-001)"
                className="w-full p-2 border rounded uppercase"
                value={extendModal.contractNumber}
                onChange={e => setExtendModal({ ...extendModal, contractNumber: e.target.value, isFound: false })}
              />
              <button type="button" onClick={searchContractForExtension} className="bg-gray-800 text-white px-4 rounded font-bold hover:bg-gray-700">Найти</button>
            </div>

            {extendModal.isFound && (
              <div className="bg-green-50 border border-green-200 p-3 rounded mb-4 text-sm">
                <p><strong>Клиент:</strong> {extendModal.clientName}</p>
                <p className="mb-2"><strong>В аренде:</strong> {extendModal.productsStr}</p>
                <p className="text-xs text-gray-500 mb-1">Быстрый расчет:</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => applyExtension('day')} className="flex-1 bg-blue-100 text-blue-700 p-1 rounded font-bold hover:bg-blue-200">+1 день</button>
                  <button type="button" onClick={() => applyExtension('week')} className="flex-1 bg-blue-100 text-blue-700 p-1 rounded font-bold hover:bg-blue-200">+1 нед.</button>
                  <button type="button" onClick={() => applyExtension('month')} className="flex-1 bg-green-100 text-green-700 p-1 rounded font-bold hover:bg-green-200">+1 мес.</button>
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Добавлено дней</label>
                <input
                  type="number" className="w-full p-2 border rounded mt-1"
                  value={extendModal.addDays} onChange={e => setExtendModal({ ...extendModal, addDays: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Доплата (BYN)</label>
                <input
                  type="number" className="w-full p-2 border rounded mt-1 font-bold text-green-600"
                  value={extendModal.addSum} onChange={e => setExtendModal({ ...extendModal, addSum: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleExtendSubmit}
                className={`flex-1 text-white p-2 rounded font-bold ${extendModal.isFound ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={!extendModal.isFound}
              >
                Оформить
              </button>
              <button type="button" onClick={() => setExtendModal({ ...extendModal, isOpen: false, isFound: false })} className="bg-gray-300 px-4 rounded hover:bg-gray-400">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ВОЗВРАТА */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 text-black">
            <h3 className="text-xl font-bold mb-4">Принять возврат</h3>
            <input
              type="text" placeholder="Номер договора (напр. 2611-001)"
              className="w-full p-2 border rounded mb-4"
              value={returnModal.contractNumber}
              onChange={e => setReturnModal({ ...returnModal, contractNumber: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleReturnSubmit} className="flex-1 bg-red-600 text-white p-2 rounded font-bold">Закрыть договор</button>
              <button type="button" onClick={() => setReturnModal({ ...returnModal, isOpen: false })} className="flex-1 bg-gray-300 p-2 rounded">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ОТЧЕТА */}
      {reportModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-5xl text-black flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Отчет по договорам</h3>
              <button type="button" onClick={() => setReportModal({ ...reportModal, isOpen: false })} className="text-gray-500 hover:text-black font-bold text-xl">&times;</button>
            </div>

            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Фильтр (например: 11.2026, Иванов, или Активен)..."
                className="flex-1 p-2 border rounded"
                value={reportModal.searchQuery}
                onChange={e => setReportModal({ ...reportModal, searchQuery: e.target.value })}
              />
              <button
                type="button"
                onClick={() => downloadCSV(reportModal.data.filter(row => Object.values(row).join(' ').toLowerCase().includes(reportModal.searchQuery.toLowerCase())))}
                className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
              >
                Скачать CSV
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border rounded">
              {reportModal.loading ? (
                <div className="p-8 text-center text-gray-500">Загрузка данных из БД...</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 border-b">Номер</th>
                      <th className="p-2 border-b">Выдача</th>
                      <th className="p-2 border-b">Возврат</th>
                      <th className="p-2 border-b">Клиент</th>
                      <th className="p-2 border-b">Оборудование</th>
                      <th className="p-2 border-b">Сумма</th>
                      <th className="p-2 border-b">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportModal.data
                      .filter(row => Object.values(row).join(' ').toLowerCase().includes(reportModal.searchQuery.toLowerCase()))
                      .map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 border-b">
                          <td className="p-2 font-medium">{row.contractNumber}</td>
                          <td className="p-2">{row.startDate}</td>
                          <td className="p-2">{row.endDate}</td>
                          <td className="p-2">{row.clientName}</td>
                          <td className="p-2 truncate max-w-xs" title={row.products}>{row.products}</td>
                          <td className="p-2 font-bold">{row.total}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${row.status === 'Активен' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}