/* Lens Diary V3.5 — 商品信息录入 V2
 * 在不改动 V3.4 核心逻辑的前提下，提供：
 * 1) OCR 字段级容错 + 低命中时完整截图兜底识别
 * 2) 品牌 / 产品 / 购买渠道拆分
 * 3) 开放品牌输入 + 最近使用品牌
 * 4) V3.4 本地数据向后兼容
 */
(() => {
  const RECENT_BRANDS_KEY = 'lensDiaryRecentBrandsV35';
  const COMMON_BRANDS = ['OLENS','moody','可啦啦','海俪恩','博士伦','库博','蜜拉贝儿'];
  const CHANNELS = ['视客','淘宝','天猫','京东','品牌官方渠道','线下门店','其他'];

  const getRecentBrands = () => {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(RECENT_BRANDS_KEY) || '[]'); } catch (_) {}
    const fromArchive = [...(state.lenses || [])].reverse().map(x => x.brand).filter(Boolean);
    return [...new Set([...stored, ...fromArchive])]
      .filter(x => !CHANNELS.includes(x))
      .slice(0, 6);
  };

  const rememberBrand = brand => {
    const b = String(brand || '').trim();
    if (!b || CHANNELS.includes(b)) return;
    const next = [b, ...getRecentBrands().filter(x => x !== b)].slice(0, 6);
    localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(next));
    renderRecentBrands();
  };

  const brandValue = () => {
    const custom = $('#brandCustom')?.value.trim() || '';
    if (custom) return custom;
    const selected = $('#brandSelect')?.value || '';
    return selected === '__custom' ? '' : selected;
  };

  const setBrandValue = value => {
    const v = String(value || '').trim();
    const select = $('#brandSelect');
    const input = $('#brandCustom');
    if (!select || !input) return;
    const fixed = [...select.options].map(o => o.value).filter(x => x && x !== '__custom');
    if (!v) {
      select.value = '';
      input.value = '';
    } else if (fixed.includes(v)) {
      select.value = v;
      input.value = v;
    } else {
      select.value = '__custom';
      input.value = v;
    }
    input.classList.add('show');
  };

  const channelValue = () => chosen('#purchaseChannelSelect', '#purchaseChannelCustom');

  const renderRecentBrands = () => {
    const box = $('#brandRecent');
    const datalist = $('#brandSuggestions');
    const recent = getRecentBrands();
    if (datalist) {
      datalist.innerHTML = [...new Set([...recent, ...COMMON_BRANDS])]
        .map(v => `<option value="${esc(v)}"></option>`).join('');
    }
    if (!box) return;
    box.innerHTML = recent.length
      ? `<span class="lens-sub" style="width:100%">最近使用</span>${recent.map(v => `<button type="button" class="chip recent-brand-btn" data-brand="${esc(v)}">${esc(v)}</button>`).join('')}`
      : '';
    box.querySelectorAll('.recent-brand-btn').forEach(btn => {
      btn.onclick = () => setBrandValue(btn.dataset.brand || '');
    });
  };

  function bindV35Fields() {
    const brandSelect = $('#brandSelect');
    const brandInput = $('#brandCustom');
    if (brandSelect && brandInput) {
      brandInput.classList.add('show');
      brandSelect.onchange = () => {
        if (brandSelect.value === '__custom') {
          brandInput.value = '';
          brandInput.focus();
        } else if (brandSelect.value) {
          brandInput.value = brandSelect.value;
        } else {
          brandInput.value = '';
        }
        brandInput.classList.add('show');
      };
      brandInput.oninput = () => {
        const v = brandInput.value.trim();
        const fixed = [...brandSelect.options].map(o => o.value);
        brandSelect.value = fixed.includes(v) ? v : (v ? '__custom' : '');
      };
    }
    if ($('#purchaseChannelSelect') && $('#purchaseChannelCustom')) {
      bindCustom('#purchaseChannelSelect', '#purchaseChannelCustom');
    }
    renderRecentBrands();
  }

  // —— OCR：在 V3.4 解析器上增加渠道识别与“渠道不当品牌”保护 ——
  const parseOCRV34 = window.parseOCR;
  window.parseOCR = raw => {
    const out = parseOCRV34(raw);
    const t = normalizeOCR(raw);
    const compact = t.replace(/\s+/g, ' ');

    out.purchaseChannel = grab(compact, [
      /(?:购买渠道|购买平台|购入渠道|购入平台|平台|店铺)\s*:?\s*(视客|淘宝|天猫|京东|品牌官方渠道|官方旗舰店|线下门店)/i
    ]);
    if (!out.purchaseChannel) {
      if (/视客/.test(compact)) out.purchaseChannel = '视客';
      else if (/天猫/.test(compact)) out.purchaseChannel = '天猫';
      else if (/淘宝/.test(compact)) out.purchaseChannel = '淘宝';
      else if (/京东/.test(compact)) out.purchaseChannel = '京东';
    }
    if (out.purchaseChannel === '官方旗舰店') out.purchaseChannel = '品牌官方渠道';

    if (CHANNELS.includes(out.brand)) {
      out.purchaseChannel = out.purchaseChannel || out.brand;
      out.brand = '';
    }
    return out;
  };

  const fillOCRV34 = window.fillOCR;
  window.fillOCR = o => {
    fillOCRV34(o);
    if (o.brand) setBrandValue(o.brand);
    if (o.purchaseChannel) setChoice('#purchaseChannelSelect', '#purchaseChannelCustom', o.purchaseChannel);
  };

  const countMappedFields = parsed => Object.entries(parsed)
    .filter(([k, v]) => v && !k.startsWith('_'))
    .length;

  async function recognize(source, stageLabel) {
    return Tesseract.recognize(source, 'chi_sim+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const p = Math.round((m.progress || 0) * 100);
          $('#ocrProgress i').style.width = p + '%';
          $('#ocrStatus').textContent = `${stageLabel} ${p}%`;
        }
      }
    });
  }

  $('#ocrBtn').onclick = async () => {
    const f = $('#ocrImage').files[0];
    if (!f) { toast('请先选择商品截图'); return; }
    if (!window.Tesseract) { toast('OCR 组件未加载，请联网后重试'); return; }

    if (!productWorkingImage) {
      try {
        productOriginalImage = await readImageDataURL(f);
        productWorkingImage = await compress(f);
        productPreview();
      } catch (_) {}
    }

    $('#ocrProgress').style.display = 'block';
    $('#ocrProgress i').style.width = '0%';
    $('#ocrStatus').textContent = '正在优化截图并识别参数…';
    $('#ocrDebug').style.display = 'none';
    $('#ocrRawText').textContent = '';

    try {
      const prepared = await makeOCRCrop(f);
      const first = await recognize(prepared, '正在识别商品参数…');
      let raw = first.data.text || '';
      let parsed = window.parseOCR(raw);

      // 首轮命中过少时，再读一次完整截图。两次文字合并后重新做字段映射，
      // 避免固定裁切区域刚好漏掉品牌、渠道或参数卡。
      if (countMappedFields(parsed) < 2) {
        $('#ocrStatus').textContent = '首轮识别信息较少，正在检查完整截图…';
        const second = await recognize(f, '正在检查完整截图…');
        const fallbackRaw = second.data.text || '';
        raw = [raw, fallbackRaw].filter(Boolean).join('\n\n--- 完整截图补充 ---\n');
        parsed = window.parseOCR(raw);
      }

      $('#ocrRawText').textContent = raw || '（没有识别到文字）';
      $('#ocrDebug').style.display = 'block';
      window.fillOCR(parsed);

      const labels = {
        brand:'品牌', name:'产品名称', purchaseChannel:'购买渠道', color:'颜色',
        dia:'DIA', gdia:'着色直径', limbal:'锁边', water:'含水量', bc:'基弧', cycle:'周期'
      };
      const coreKeys = ['brand','name','purchaseChannel','dia','gdia','water','bc','cycle'];
      const found = coreKeys.filter(k => parsed[k]).map(k => labels[k]);
      const missing = coreKeys.filter(k => !parsed[k]).map(k => labels[k]);

      if (found.length) {
        $('#ocrStatus').textContent = `已识别：${found.join('、')}。${missing.length ? `未识别：${missing.join('、')}，可直接手动补充。` : '请逐项核对后保存。'}`;
      } else {
        $('#ocrStatus').textContent = '这张图暂时没能可靠映射到字段，但不影响继续录入。可查看原始文字，或直接手动填写。';
      }
    } catch (err) {
      console.error(err);
      $('#ocrStatus').textContent = '自动识别没有完成，但不影响录入。你可以继续手动填写并保存已确认的信息。';
      $('#ocrDebug').style.display = $('#ocrRawText').textContent ? 'block' : 'none';
    }
  };

  // —— 表单：字段均可为空，只阻止完全空白档案；新增 purchaseChannel ——
  $('#lensForm').onsubmit = e => {
    e.preventDefault();
    const brand = brandValue();
    const name = $('#productName').value.trim();
    const purchaseChannel = channelValue();
    const item = {
      id: $('#lensEditId').value || 'l' + Date.now(),
      brand,
      name,
      purchaseChannel,
      color: chosen('#colorSelect','#colorCustom'),
      dia: chosen('#diaSelect','#diaCustom'),
      gdia: chosen('#gdiaSelect','#gdiaCustom'),
      limbal: chosen('#limbalSelect','#limbalCustom'),
      water: chosen('#waterSelect','#waterCustom'),
      bc: chosen('#bcSelect','#bcCustom'),
      cycle: chosen('#cycleSelect','#cycleCustom'),
      comfort: Number($('#comfort').value),
      rating: Number($('#rating').value),
      note: $('#lensNote').value.trim(),
      productImage: productWorkingImage,
      productOriginalImage,
      images: [...lensWorkingImages]
    };

    const hasUsefulData = [item.brand,item.name,item.purchaseChannel,item.color,item.dia,item.gdia,item.limbal,item.water,item.bc,item.cycle,item.note,item.productImage]
      .some(Boolean) || item.images.length;
    if (!hasUsefulData) { toast('至少填写一项信息或上传一张图片'); return; }

    const idx = state.lenses.findIndex(x => x.id === item.id);
    if (idx >= 0) state.lenses[idx] = item; else state.lenses.push(item);
    if (!persist()) return;
    rememberBrand(brand);
    hide('lensModal');
    render();
    toast(idx >= 0 ? '档案已修改' : '档案已保存');
  };

  // —— 打开/编辑：兼容没有 purchaseChannel 的 V3.4 老数据 ——
  const openLensV34 = window.openLens;
  window.openLens = () => {
    openLensV34();
    setBrandValue('');
    setChoice('#purchaseChannelSelect', '#purchaseChannelCustom', '');
    renderRecentBrands();
  };

  const editLensV34 = window.editLens;
  window.editLens = id => {
    editLensV34(id);
    const x = state.lenses.find(v => v.id === id);
    setBrandValue(x?.brand || '');
    setChoice('#purchaseChannelSelect', '#purchaseChannelCustom', x?.purchaseChannel || '');
    renderRecentBrands();
  };

  // —— 展示/搜索：渠道可见且可搜索；空品牌/产品名有安全兜底 ——
  const titleOf = x => [x.brand, x.name].filter(Boolean).join(' · ') || '未命名美瞳';

  window.lensHTML = x => `<div class="card">
<div class="archive-main">
  <div class="product-cover">${x.productImage?`<img src="${x.productImage}" alt="${esc(x.name || '美瞳')} 产品图">`:'暂无产品图'}</div>
  <div class="archive-info">
    <div class="card-top">
      <div><div class="lens-title">${esc(titleOf(x))}</div><div class="lens-sub"><span class="rating">★ ${esc(x.rating)}</span> · 舒适度 ${esc(x.comfort)}/5</div></div>
      <button class="icon-btn" onclick="editLens('${x.id}')">编辑</button>
    </div>
    <div class="meta-row">${[x.purchaseChannel&&'渠道 '+x.purchaseChannel,x.color,x.dia&&'DIA '+x.dia,x.gdia&&'G.DIA '+x.gdia,x.limbal,x.water&&'含水 '+x.water,x.bc&&'BC '+x.bc,x.cycle].filter(Boolean).map(v=>`<span class="chip">${esc(v)}</span>`).join('')}</div>
    ${x.note?`<div class="note">${esc(x.note)}</div>`:''}
  </div>
</div>
${strip(x.images,true)}</div>`;

  window.renderLenses = () => {
    const q = $('#lensSearch').value.trim().toLowerCase();
    const f = state.lenses.filter(x => [x.brand,x.name,x.purchaseChannel,x.color,x.dia,x.gdia,x.limbal,x.water,x.bc,x.cycle,x.note].join(' ').toLowerCase().includes(q));
    $('#lensCountText').textContent = `${state.lenses.length} 款`;
    $('#lensSearchNote').textContent = q ? `找到 ${f.length} 条` : '';
    $('#lensList').innerHTML = f.length
      ? f.slice().reverse().map(window.lensHTML).join('')
      : `<div class="empty"><h3>${state.lenses.length?'没有匹配结果':'还没有档案'}</h3><p>${state.lenses.length?'换一个关键词试试。':'先记录一款最近戴过的美瞳。'}</p></div>`;
  };

  window.renderSelect = () => {
    const s = $('#diaryLensSelect');
    s.innerHTML = state.lenses.map(x => `<option value="${x.id}">${esc(titleOf(x))}</option>`).join('');
  };

  bindV35Fields();
  render();
})();
