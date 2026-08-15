const fs = require('fs');
let content = fs.readFileSync('src/components/HomeView.tsx', 'utf8');

// 1. Remove text comments that were rendering as text
content = content.replace('/* ================= PAGE 1 ================= */', '');
content = content.replace('/* ================= PAGE 2 ================= */', '');

// 2. Add showCard helper definition
const showCardFunction = `const filteredHospitals = HOSPITALS.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const q = searchQuery.toLowerCase().trim();
  const showCard = (keywords) => {
    if (!q) return true;
    return keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  };`;
content = content.replace(
    'const filteredHospitals = HOSPITALS.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));',
    showCardFunction
);

// 3. Wrap Card 0: Weather
let card0Target = `          {/* 0. Van Hava Durumu Card */}
          <div className={\`\${cardBg}`;
content = content.replace(card0Target, `          {/* 0. Van Hava Durumu Card */}
          {showCard(['hava', 'durum', 'sıcak', 'mgm', 'derece', 'güneş']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `            </button>
          </div>

          {/* NEW: Van İş İlanları`,
    `            </button>
          </div>
          )}

          {/* NEW: Van İş İlanları`);

// 4. Wrap Promo Card: Jobs
let promoTarget = `          {/* NEW: Van İş İlanları & Usta Rehberi Promo Card */}
          <div className={\`rounded-3xl`;
content = content.replace(promoTarget, `          {/* NEW: Van İş İlanları & Usta Rehberi Promo Card */}
          {showCard(['iş', 'ilan', 'usta', 'temizlik', 'nakliye', 'özel']) && (
          <div className={\`rounded-3xl`);

content = content.replace(
    `              )}
            </div>
          </div>

          {/* 1. Nöbetçi Eczaneler Card */}`,
    `              )}
            </div>
          </div>
          )}

          {/* 1. Nöbetçi Eczaneler Card */}`);

// 5. Wrap Card 1: Pharmacies
let c1Target = `          {/* 1. Nöbetçi Eczaneler Card */}
          <div className={\`\${cardBg}`;
content = content.replace(c1Target, `          {/* 1. Nöbetçi Eczaneler Card */}
          {showCard(['eczane', 'nöbet', 'sağlık', 'ilaç']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `              </button>
            </div>
          </div>

          {/* 2. Ezan Vakitleri Card */}`,
    `              </button>
            </div>
          </div>
          )}

          {/* 2. Ezan Vakitleri Card */}`);

// 6. Wrap Card 2: Prayers
let c2Target = `          {/* 2. Ezan Vakitleri Card */}
          <div className={\`\${cardBg}`;
content = content.replace(c2Target, `          {/* 2. Ezan Vakitleri Card */}
          {showCard(['ezan', 'vakit', 'namaz', 'diyanet', 'imsak', 'sabah', 'öğle', 'ikindi', 'akşam', 'yatsı']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `            </div>
          </div>

          {/* 3. Döviz Kuru Card`,
    `            </div>
          </div>
          )}

          {/* 3. Döviz Kuru Card`);

// 7. Wrap Card 3: Currencies
let c3Target = `          {/* 3. Döviz Kuru Card (doviz.com Canlı) */}
          <div className={\`\${cardBg}`;
content = content.replace(c3Target, `          {/* 3. Döviz Kuru Card (doviz.com Canlı) */}
          {showCard(['döviz', 'kur', 'altın', 'dolar', 'euro', 'finans', 'para']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `            )}
          </div>

        </div>

        <div className="space-y-4 animate-fadeIn mt-4">

          {/* 1. Vanda Bulunan Hastaneler Card */}`,
    `            )}
          </div>
          )}

        </div>

        <div className="space-y-4 animate-fadeIn mt-4">

          {/* 1. Vanda Bulunan Hastaneler Card */}`);

// 8. Wrap Card 4: Hospitals
let c4Target = `          {/* 1. Vanda Bulunan Hastaneler Card */}
          <div className={\`\${cardBg}`;
content = content.replace(c4Target, `          {/* 1. Vanda Bulunan Hastaneler Card */}
          {showCard(['hastane', 'sağlık', 'randevu', 'doktor', 'acil']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `              </button>
            </div>
          </div>

          {/* 2. Otobüs Saatleri`,
    `              </button>
            </div>
          </div>
          )}

          {/* 2. Otobüs Saatleri`);

// 9. Wrap Card 5: Buses
let c5Target = `          {/* 2. Otobüs Saatleri ve Durakları Card */}
          <div className={\`\${cardBg}`;
content = content.replace(c5Target, `          {/* 2. Otobüs Saatleri ve Durakları Card */}
          {showCard(['otobüs', 'saat', 'durak', 'ulaşım', 'belvan', 'hat']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `              </button>
            </div>
          </div>

          {/* 3. Acil Taksi Card */}`,
    `              </button>
            </div>
          </div>
          )}

          {/* 3. Acil Taksi Card */}`);

// 10. Wrap Card 6: Taxis
let c6Target = `          {/* 3. Acil Taksi Card */}
          <div className={\`\${cardBg}`;
content = content.replace(c6Target, `          {/* 3. Acil Taksi Card */}
          {showCard(['taksi', 'acil', 'ulaşım', 'şoför']) && (
          <div className={\`\${cardBg}`);

content = content.replace(
    `            </div>
          </div>

        </div>

      </div>`,
    `            </div>
          </div>
          )}

        </div>

      </div>`);


fs.writeFileSync('src/components/HomeView.tsx', content);
console.log('Success');
