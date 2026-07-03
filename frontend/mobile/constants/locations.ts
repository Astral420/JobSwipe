// Countries with full city and region data
export const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Philippines',
];

// US States
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia', 'Puerto Rico',
];

// Canadian Provinces
export const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon',
];

// UK Regions
export const UK_REGIONS = [
  'England', 'Scotland', 'Wales', 'Northern Ireland',
  'Greater London', 'South East', 'South West', 'West Midlands', 'North West',
  'North East', 'Yorkshire and the Humber', 'East Midlands', 'East of England',
];

// Australian States
export const AUSTRALIAN_STATES = [
  'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
  'Tasmania', 'Australian Capital Territory', 'Northern Territory',
];

// Philippines Regions
export const PHILIPPINES_REGIONS = [
  'National Capital Region (NCR)',
  'Cordillera Administrative Region (CAR)',
  'Ilocos Region (Region I)',
  'Cagayan Valley (Region II)',
  'Central Luzon (Region III)',
  'Calabarzon (Region IV-A)',
  'Mimaropa (Region IV-B)',
  'Bicol Region (Region V)',
  'Western Visayas (Region VI)',
  'Central Visayas (Region VII)',
  'Eastern Visayas (Region VIII)',
  'Zamboanga Peninsula (Region IX)',
  'Northern Mindanao (Region X)',
  'Davao Region (Region XI)',
  'Soccsksargen (Region XII)',
  'Caraga (Region XIII)',
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
];

// Philippines Provinces by Region
export const PHILIPPINES_PROVINCES_BY_REGION: Record<string, string[]> = {
  'National Capital Region (NCR)': ['Metro Manila'],
  'Cordillera Administrative Region (CAR)': ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
  'Ilocos Region (Region I)': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
  'Cagayan Valley (Region II)': ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
  'Central Luzon (Region III)': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
  'Calabarzon (Region IV-A)': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
  'Mimaropa (Region IV-B)': ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'],
  'Bicol Region (Region V)': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
  'Western Visayas (Region VI)': ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
  'Central Visayas (Region VII)': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
  'Eastern Visayas (Region VIII)': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
  'Zamboanga Peninsula (Region IX)': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
  'Northern Mindanao (Region X)': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
  'Davao Region (Region XI)': ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
  'Soccsksargen (Region XII)': ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
  'Caraga (Region XIII)': ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)': ['Basilan', 'Lanao del Sur', 'Maguindanao', 'Sulu', 'Tawi-Tawi'],
};

// Philippines Cities by Province
export const PHILIPPINES_CITIES_BY_PROVINCE: Record<string, string[]> = {
  // NCR - All 16 cities and 1 municipality
  'Metro Manila': [
    'Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong', 'Pasay',
    'Caloocan', 'Las Piñas', 'Muntinlupa', 'Parañaque', 'Valenzuela', 'Malabon',
    'Marikina', 'Navotas', 'San Juan', 'Pateros'
  ],
  
  // CAR - Cordillera Administrative Region
  'Benguet': ['Baguio', 'La Trinidad', 'Itogon', 'Sablan', 'Tuba', 'Tublay'],
  'Abra': ['Bangued', 'Bucay', 'Dolores', 'La Paz', 'Lagangilang', 'Lacub', 'Luba', 'Malibcong', 'Manabo', 'Peñarrubia', 'Pidigan', 'Pilar', 'Sallapadan', 'San Isidro', 'San Juan', 'San Quintin', 'Tayum', 'Tineg', 'Tubo', 'Villaviciosa'],
  'Apayao': ['Kabugao', 'Calanasan', 'Conner', 'Flora', 'Luna', 'Pudtol', 'Santa Marcela'],
  'Ifugao': ['Lagawe', 'Aguinaldo', 'Alfonso Lista', 'Asipulo', 'Banaue', 'Hingyon', 'Hungduan', 'Kiangan', 'Lamut', 'Mayoyao', 'Tinoc'],
  'Kalinga': ['Tabuk', 'Balbalan', 'Lubuagan', 'Pasil', 'Pinukpuk', 'Rizal', 'Tanudan', 'Tinglayan'],
  'Mountain Province': ['Bontoc', 'Barlig', 'Bauko', 'Besao', 'Natonin', 'Paracelis', 'Sabangan', 'Sadanga', 'Sagada', 'Tadian'],
  
  // Region I - Ilocos Region
  'Ilocos Norte': ['Laoag', 'Batac', 'Bacarra', 'Badoc', 'Bangui', 'Banna', 'Burgos', 'Carasi', 'Currimao', 'Dingras', 'Dumalneg', 'Marcos', 'Nueva Era', 'Pagudpud', 'Paoay', 'Pasuquin', 'Piddig', 'Pinili', 'San Nicolas', 'Sarrat', 'Solsona', 'Vintar'],
  'Ilocos Sur': ['Vigan', 'Candon', 'Alilem', 'Banayoyo', 'Bantay', 'Burgos', 'Cabugao', 'Caoayan', 'Cervantes', 'Galimuyod', 'Gregorio del Pilar', 'Lidlidda', 'Magsingal', 'Nagbukel', 'Narvacan', 'Quirino', 'Salcedo', 'San Emilio', 'San Esteban', 'San Ildefonso', 'San Juan', 'San Vicente', 'Santa', 'Santa Catalina', 'Santa Cruz', 'Santa Lucia', 'Santa Maria', 'Santiago', 'Santo Domingo', 'Sigay', 'Sinait', 'Sugpon', 'Suyo', 'Tagudin'],
  'La Union': ['San Fernando', 'Agoo', 'Aringay', 'Bacnotan', 'Bagulin', 'Balaoan', 'Bangar', 'Bauang', 'Burgos', 'Caba', 'Luna', 'Naguilian', 'Pugo', 'Rosario', 'San Gabriel', 'San Juan', 'Santo Tomas', 'Santol', 'Sudipen', 'Tubao'],
  'Pangasinan': ['Dagupan', 'Alaminos', 'San Carlos', 'Urdaneta', 'Agno', 'Aguilar', 'Alcala', 'Anda', 'Asingan', 'Balungao', 'Bani', 'Basista', 'Bautista', 'Bayambang', 'Binalonan', 'Binmaley', 'Bolinao', 'Bugallon', 'Burgos', 'Calasiao', 'Dasol', 'Infanta', 'Labrador', 'Laoac', 'Lingayen', 'Mabini', 'Malasiqui', 'Manaoag', 'Mangaldan', 'Mangatarem', 'Mapandan', 'Natividad', 'Pozorrubio', 'Rosales', 'San Fabian', 'San Jacinto', 'San Manuel', 'San Nicolas', 'San Quintin', 'Santa Barbara', 'Santa Maria', 'Santo Tomas', 'Sison', 'Sual', 'Tayug', 'Umingan', 'Urbiztondo', 'Villasis'],
  
  // Region II - Cagayan Valley
  'Batanes': ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan'],
  'Cagayan': ['Tuguegarao', 'Abulug', 'Alcala', 'Allacapan', 'Amulung', 'Aparri', 'Baggao', 'Ballesteros', 'Buguey', 'Calayan', 'Camalaniugan', 'Claveria', 'Enrile', 'Gattaran', 'Gonzaga', 'Iguig', 'Lal-lo', 'Lasam', 'Pamplona', 'Peñablanca', 'Piat', 'Rizal', 'Sanchez-Mira', 'Santa Ana', 'Santa Praxedes', 'Santa Teresita', 'Santo Niño', 'Solana', 'Tuao'],
  'Isabela': ['Ilagan', 'Cauayan', 'Santiago', 'Alicia', 'Angadanan', 'Aurora', 'Benito Soliven', 'Burgos', 'Cabagan', 'Cabatuan', 'Cordon', 'Delfin Albano', 'Dinapigue', 'Divilacan', 'Echague', 'Gamu', 'Jones', 'Luna', 'Maconacon', 'Mallig', 'Naguilian', 'Palanan', 'Quezon', 'Quirino', 'Ramon', 'Reina Mercedes', 'Roxas', 'San Agustin', 'San Guillermo', 'San Isidro', 'San Manuel', 'San Mariano', 'San Mateo', 'San Pablo', 'Santa Maria', 'Santo Tomas', 'Tumauini'],
  'Nueva Vizcaya': ['Bayombong', 'Alfonso Castañeda', 'Ambaguio', 'Aritao', 'Bagabag', 'Bambang', 'Diadi', 'Dupax del Norte', 'Dupax del Sur', 'Kasibu', 'Kayapa', 'Quezon', 'Santa Fe', 'Solano', 'Villaverde'],
  'Quirino': ['Cabarroguis', 'Aglipay', 'Diffun', 'Maddela', 'Nagtipunan', 'Saguday'],
  
  // Region III - Central Luzon
  'Aurora': ['Baler', 'Casiguran', 'Dilasag', 'Dinalungan', 'Dingalan', 'Dipaculao', 'Maria Aurora', 'San Luis'],
  'Bataan': ['Balanga', 'Abucay', 'Bagac', 'Dinalupihan', 'Hermosa', 'Limay', 'Mariveles', 'Morong', 'Orani', 'Orion', 'Pilar', 'Samal'],
  'Bulacan': ['Malolos', 'Meycauayan', 'San Jose del Monte', 'Angat', 'Balagtas', 'Baliuag', 'Bocaue', 'Bulakan', 'Bustos', 'Calumpit', 'Doña Remedios Trinidad', 'Guiguinto', 'Hagonoy', 'Marilao', 'Norzagaray', 'Obando', 'Pandi', 'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso', 'San Miguel', 'San Rafael', 'Santa Maria'],
  'Nueva Ecija': ['Cabanatuan', 'Gapan', 'Muñoz', 'Palayan', 'San Jose', 'Aliaga', 'Bongabon', 'Cabiao', 'Carranglan', 'Cuyapo', 'Gabaldon', 'General Mamerto Natividad', 'General Tinio', 'Guimba', 'Jaen', 'Laur', 'Licab', 'Llanera', 'Lupao', 'Nampicuan', 'Pantabangan', 'Peñaranda', 'Quezon', 'Rizal', 'San Antonio', 'San Isidro', 'San Leonardo', 'Santa Rosa', 'Santo Domingo', 'Talavera', 'Talugtug', 'Zaragoza'],
  'Pampanga': ['Angeles', 'San Fernando', 'Mabalacat', 'Apalit', 'Arayat', 'Bacolor', 'Candaba', 'Floridablanca', 'Guagua', 'Lubao', 'Macabebe', 'Magalang', 'Masantol', 'Mexico', 'Minalin', 'Porac', 'San Luis', 'San Simon', 'Santa Ana', 'Santa Rita', 'Santo Tomas', 'Sasmuan'],
  'Tarlac': ['Tarlac City', 'Anao', 'Bamban', 'Camiling', 'Capas', 'Concepcion', 'Gerona', 'La Paz', 'Mayantoc', 'Moncada', 'Paniqui', 'Pura', 'Ramos', 'San Clemente', 'San Jose', 'San Manuel', 'Santa Ignacia', 'Victoria'],
  'Zambales': ['Olongapo', 'Botolan', 'Cabangan', 'Candelaria', 'Castillejos', 'Iba', 'Masinloc', 'Palauig', 'San Antonio', 'San Felipe', 'San Marcelino', 'San Narciso', 'Santa Cruz', 'Subic'],
  
  // Region IV-A (Calabarzon)
  'Batangas': ['Batangas City', 'Lipa', 'Tanauan', 'Agoncillo', 'Alitagtag', 'Balayan', 'Balete', 'Bauan', 'Calaca', 'Calatagan', 'Cuenca', 'Ibaan', 'Laurel', 'Lemery', 'Lian', 'Lobo', 'Mabini', 'Malvar', 'Mataas na Kahoy', 'Nasugbu', 'Padre Garcia', 'Rosario', 'San Jose', 'San Juan', 'San Luis', 'San Nicolas', 'San Pascual', 'Santa Teresita', 'Santo Tomas', 'Taal', 'Talisay', 'Taysan', 'Tingloy', 'Tuy'],
  'Cavite': ['Bacoor', 'Cavite City', 'Dasmariñas', 'Imus', 'Tagaytay', 'Trece Martires', 'Alfonso', 'Amadeo', 'Carmona', 'General Emilio Aguinaldo', 'General Mariano Alvarez', 'General Trias', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario', 'Silang', 'Tanza', 'Ternate'],
  'Laguna': ['Calamba', 'San Pablo', 'Santa Rosa', 'Biñan', 'Alaminos', 'Bay', 'Cabuyao', 'Calauan', 'Cavinti', 'Famy', 'Kalayaan', 'Liliw', 'Los Baños', 'Luisiana', 'Lumban', 'Mabitac', 'Magdalena', 'Majayjay', 'Nagcarlan', 'Paete', 'Pagsanjan', 'Pakil', 'Pangil', 'Pila', 'Rizal', 'San Pedro', 'Santa Cruz', 'Santa Maria', 'Siniloan', 'Victoria'],
  'Quezon': ['Lucena', 'Tayabas', 'Agdangan', 'Alabat', 'Atimonan', 'Buenavista', 'Burdeos', 'Calauag', 'Candelaria', 'Catanauan', 'Dolores', 'General Luna', 'General Nakar', 'Guinayangan', 'Gumaca', 'Infanta', 'Jomalig', 'Lopez', 'Lucban', 'Macalelon', 'Mauban', 'Mulanay', 'Padre Burgos', 'Pagbilao', 'Panukulan', 'Patnanungan', 'Perez', 'Pitogo', 'Plaridel', 'Polillo', 'Quezon', 'Real', 'Sampaloc', 'San Andres', 'San Antonio', 'San Francisco', 'San Narciso', 'Sariaya', 'Tagkawayan', 'Tiaong', 'Unisan'],
  'Rizal': ['Antipolo', 'Angono', 'Baras', 'Binangonan', 'Cainta', 'Cardona', 'Jalajala', 'Morong', 'Pililla', 'Rodriguez', 'San Mateo', 'Tanay', 'Taytay', 'Teresa'],
  
  // Region IV-B (Mimaropa)
  'Marinduque': ['Boac', 'Buenavista', 'Gasan', 'Mogpog', 'Santa Cruz', 'Torrijos'],
  'Occidental Mindoro': ['Mamburao', 'San Jose', 'Abra de Ilog', 'Calintaan', 'Looc', 'Lubang', 'Magsaysay', 'Paluan', 'Rizal', 'Sablayan', 'Santa Cruz'],
  'Oriental Mindoro': ['Calapan', 'Baco', 'Bansud', 'Bongabong', 'Bulalacao', 'Gloria', 'Mansalay', 'Naujan', 'Pinamalayan', 'Pola', 'Puerto Galera', 'Roxas', 'San Teodoro', 'Socorro', 'Victoria'],
  'Palawan': ['Puerto Princesa', 'Aborlan', 'Agutaya', 'Araceli', 'Balabac', 'Bataraza', 'Brooke\'s Point', 'Busuanga', 'Cagayancillo', 'Coron', 'Culion', 'Cuyo', 'Dumaran', 'El Nido', 'Kalayaan', 'Linapacan', 'Magsaysay', 'Narra', 'Quezon', 'Rizal', 'Roxas', 'San Vicente', 'Sofronio Española', 'Taytay'],
  'Romblon': ['Romblon', 'Alcantara', 'Banton', 'Cajidiocan', 'Calatrava', 'Concepcion', 'Corcuera', 'Ferrol', 'Looc', 'Magdiwang', 'Odiongan', 'San Agustin', 'San Andres', 'San Fernando', 'San Jose', 'Santa Fe', 'Santa Maria'],
  
  // Region V (Bicol)
  'Albay': ['Legazpi', 'Tabaco', 'Ligao', 'Bacacay', 'Camalig', 'Daraga', 'Guinobatan', 'Jovellar', 'Libon', 'Malilipot', 'Malinao', 'Manito', 'Oas', 'Pio Duran', 'Polangui', 'Rapu-Rapu', 'Santo Domingo', 'Tiwi'],
  'Camarines Norte': ['Daet', 'Basud', 'Capalonga', 'Jose Panganiban', 'Labo', 'Mercedes', 'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Santa Elena', 'Talisay', 'Vinzons'],
  'Camarines Sur': ['Naga', 'Iriga', 'Baao', 'Balatan', 'Bato', 'Bombon', 'Buhi', 'Bula', 'Cabusao', 'Calabanga', 'Camaligan', 'Canaman', 'Caramoan', 'Del Gallego', 'Gainza', 'Garchitorena', 'Goa', 'Lagonoy', 'Libmanan', 'Lupi', 'Magarao', 'Milaor', 'Minalabac', 'Nabua', 'Ocampo', 'Pamplona', 'Pasacao', 'Pili', 'Presentacion', 'Ragay', 'Sagñay', 'San Fernando', 'San Jose', 'Sipocot', 'Siruma', 'Tigaon', 'Tinambac'],
  'Catanduanes': ['Virac', 'Bagamanoc', 'Baras', 'Bato', 'Caramoran', 'Gigmoto', 'Pandan', 'Panganiban', 'San Andres', 'San Miguel', 'Viga'],
  'Masbate': ['Masbate City', 'Aroroy', 'Baleno', 'Balud', 'Batuan', 'Cataingan', 'Cawayan', 'Claveria', 'Dimasalang', 'Esperanza', 'Mandaon', 'Milagros', 'Mobo', 'Monreal', 'Palanas', 'Pio V. Corpuz', 'Placer', 'San Fernando', 'San Jacinto', 'San Pascual', 'Uson'],
  'Sorsogon': ['Sorsogon City', 'Barcelona', 'Bulan', 'Bulusan', 'Casiguran', 'Castilla', 'Donsol', 'Gubat', 'Irosin', 'Juban', 'Magallanes', 'Matnog', 'Pilar', 'Prieto Diaz', 'Santa Magdalena'],
  
  // Region VI (Western Visayas)
  'Aklan': ['Kalibo', 'Altavas', 'Balete', 'Banga', 'Batan', 'Buruanga', 'Ibajay', 'Lezo', 'Libacao', 'Madalag', 'Makato', 'Malay', 'Malinao', 'Nabas', 'New Washington', 'Numancia', 'Tangalan'],
  'Antique': ['San Jose de Buenavista', 'Anini-y', 'Barbaza', 'Belison', 'Bugasong', 'Caluya', 'Culasi', 'Hamtic', 'Laua-an', 'Libertad', 'Pandan', 'Patnongon', 'San Remigio', 'Sebaste', 'Sibalom', 'Tibiao', 'Tobias Fornier', 'Valderrama'],
  'Capiz': ['Roxas City', 'Cuartero', 'Dao', 'Dumalag', 'Dumarao', 'Ivisan', 'Jamindan', 'Maayon', 'Mambusao', 'Panay', 'Panitan', 'Pilar', 'Pontevedra', 'President Roxas', 'Sapi-an', 'Sigma', 'Tapaz'],
  'Guimaras': ['Jordan', 'Buenavista', 'Nueva Valencia', 'San Lorenzo', 'Sibunag'],
  'Iloilo': ['Iloilo City', 'Passi', 'Ajuy', 'Alimodian', 'Anilao', 'Badiangan', 'Balasan', 'Banate', 'Barotac Nuevo', 'Barotac Viejo', 'Batad', 'Bingawan', 'Cabatuan', 'Calinog', 'Carles', 'Concepcion', 'Dingle', 'Dueñas', 'Dumangas', 'Estancia', 'Guimbal', 'Igbaras', 'Janiuay', 'Lambunao', 'Leganes', 'Lemery', 'Leon', 'Maasin', 'Miagao', 'Mina', 'New Lucena', 'Oton', 'Pavia', 'Pototan', 'San Dionisio', 'San Enrique', 'San Joaquin', 'San Miguel', 'San Rafael', 'Santa Barbara', 'Sara', 'Tigbauan', 'Tubungan', 'Zarraga'],
  'Negros Occidental': ['Bacolod', 'Bago', 'Cadiz', 'Escalante', 'Himamaylan', 'Kabankalan', 'La Carlota', 'Sagay', 'San Carlos', 'Silay', 'Sipalay', 'Talisay', 'Victorias', 'Binalbagan', 'Calatrava', 'Candoni', 'Cauayan', 'Enrique B. Magalona', 'Hinigaran', 'Hinoba-an', 'Ilog', 'Isabela', 'La Castellana', 'Manapla', 'Moises Padilla', 'Murcia', 'Pontevedra', 'Pulupandan', 'Salvador Benedicto', 'San Enrique', 'Toboso', 'Valladolid'],
  
  // Region VII (Central Visayas)
  'Bohol': ['Tagbilaran', 'Alburquerque', 'Alicia', 'Anda', 'Antequera', 'Baclayon', 'Balilihan', 'Batuan', 'Bien Unido', 'Bilar', 'Buenavista', 'Calape', 'Candijay', 'Carmen', 'Catigbian', 'Clarin', 'Corella', 'Cortes', 'Dagohoy', 'Danao', 'Dauis', 'Dimiao', 'Duero', 'Garcia Hernandez', 'Getafe', 'Guindulman', 'Inabanga', 'Jagna', 'Lila', 'Loay', 'Loboc', 'Loon', 'Mabini', 'Maribojoc', 'Panglao', 'Pilar', 'President Carlos P. Garcia', 'Sagbayan', 'San Isidro', 'San Miguel', 'Sevilla', 'Sierra Bullones', 'Sikatuna', 'Talibon', 'Trinidad', 'Tubigon', 'Ubay', 'Valencia'],
  'Cebu': ['Cebu City', 'Mandaue', 'Lapu-Lapu', 'Talisay', 'Toledo', 'Danao', 'Bogo', 'Carcar', 'Naga', 'Alcantara', 'Alcoy', 'Alegria', 'Aloguinsan', 'Argao', 'Asturias', 'Badian', 'Balamban', 'Bantayan', 'Barili', 'Boljoon', 'Borbon', 'Carmen', 'Catmon', 'Compostela', 'Consolacion', 'Cordova', 'Daanbantayan', 'Dalaguete', 'Dumanjug', 'Ginatilan', 'Liloan', 'Madridejos', 'Malabuyoc', 'Medellin', 'Minglanilla', 'Moalboal', 'Oslob', 'Pilar', 'Pinamungajan', 'Poro', 'Ronda', 'Samboan', 'San Fernando', 'San Francisco', 'San Remigio', 'Santa Fe', 'Santander', 'Sibonga', 'Sogod', 'Tabogon', 'Tabuelan', 'Tuburan', 'Tudela'],
  'Negros Oriental': ['Dumaguete', 'Bais', 'Bayawan', 'Canlaon', 'Guihulngan', 'Tanjay', 'Amlan', 'Ayungon', 'Bacong', 'Basay', 'Bindoy', 'Dauin', 'Jimalalud', 'La Libertad', 'Mabinay', 'Manjuyod', 'Pamplona', 'San Jose', 'Santa Catalina', 'Siaton', 'Sibulan', 'Tayasan', 'Valencia', 'Vallehermoso', 'Zamboanguita'],
  'Siquijor': ['Siquijor', 'Enrique Villanueva', 'Larena', 'Lazi', 'Maria', 'San Juan'],
  
  // Region VIII (Eastern Visayas)
  'Biliran': ['Naval', 'Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Culaba', 'Kawayan', 'Maripipi'],
  'Eastern Samar': ['Borongan', 'Arteche', 'Balangiga', 'Balangkayan', 'Can-avid', 'Dolores', 'General MacArthur', 'Giporlos', 'Guiuan', 'Hernani', 'Jipapad', 'Lawaan', 'Llorente', 'Maslog', 'Maydolong', 'Mercedes', 'Oras', 'Quinapondan', 'Salcedo', 'San Julian', 'San Policarpo', 'Sulat', 'Taft'],
  'Leyte': ['Tacloban', 'Ormoc', 'Baybay', 'Abuyog', 'Alangalang', 'Albuera', 'Babatngon', 'Barugo', 'Bato', 'Burauen', 'Calubian', 'Capoocan', 'Carigara', 'Dagami', 'Dulag', 'Hilongos', 'Hindang', 'Inopacan', 'Isabel', 'Jaro', 'Javier', 'Julita', 'Kananga', 'La Paz', 'Leyte', 'MacArthur', 'Mahaplag', 'Matag-ob', 'Matalom', 'Mayorga', 'Merida', 'Palo', 'Palompon', 'Pastrana', 'San Isidro', 'San Miguel', 'Santa Fe', 'Tabango', 'Tabontabon', 'Tanauan', 'Tolosa', 'Tunga', 'Villaba'],
  'Northern Samar': ['Catarman', 'Allen', 'Biri', 'Bobon', 'Capul', 'Catubig', 'Gamay', 'Laoang', 'Lapinig', 'Las Navas', 'Lavezares', 'Lope de Vega', 'Mapanas', 'Mondragon', 'Palapag', 'Pambujan', 'Rosario', 'San Antonio', 'San Isidro', 'San Jose', 'San Roque', 'San Vicente', 'Silvino Lobos', 'Victoria'],
  'Samar': ['Calbayog', 'Catbalogan', 'Almagro', 'Basey', 'Calbiga', 'Daram', 'Gandara', 'Hinabangan', 'Jiabong', 'Marabut', 'Matuguinao', 'Motiong', 'Pagsanghan', 'Paranas', 'Pinabacdao', 'San Jorge', 'San Jose de Buan', 'San Sebastian', 'Santa Margarita', 'Santa Rita', 'Santo Niño', 'Tagapul-an', 'Talalora', 'Tarangnan', 'Villareal', 'Zumarraga'],
  'Southern Leyte': ['Maasin', 'Anahawan', 'Bontoc', 'Hinunangan', 'Hinundayan', 'Libagon', 'Liloan', 'Limasawa', 'Macrohon', 'Malitbog', 'Padre Burgos', 'Pintuyan', 'Saint Bernard', 'San Francisco', 'San Juan', 'San Ricardo', 'Silago', 'Sogod', 'Tomas Oppus'],
  
  // Region IX (Zamboanga Peninsula)
  'Zamboanga del Norte': ['Dipolog', 'Dapitan', 'Baliguian', 'Godod', 'Gutalac', 'Jose Dalman', 'Kalawit', 'Katipunan', 'La Libertad', 'Labason', 'Liloy', 'Manukan', 'Mutia', 'Piñan', 'Polanco', 'President Manuel A. Roxas', 'Rizal', 'Salug', 'Sergio Osmeña Sr.', 'Siayan', 'Sibuco', 'Sibutad', 'Sindangan', 'Siocon', 'Sirawai', 'Tampilisan'],
  'Zamboanga del Sur': ['Zamboanga City', 'Pagadian', 'Aurora', 'Bayog', 'Dimataling', 'Dinas', 'Dumalinao', 'Dumingag', 'Guipos', 'Josefina', 'Kumalarang', 'Labangan', 'Lakewood', 'Lapuyan', 'Mahayag', 'Margosatubig', 'Midsalip', 'Molave', 'Pitogo', 'Ramon Magsaysay', 'San Miguel', 'San Pablo', 'Sominot', 'Tabina', 'Tambulig', 'Tigbao', 'Tukuran', 'Vincenzo A. Sagun'],
  'Zamboanga Sibugay': ['Ipil', 'Alicia', 'Buug', 'Diplahan', 'Imelda', 'Kabasalan', 'Mabuhay', 'Malangas', 'Naga', 'Olutanga', 'Payao', 'Roseller Lim', 'Siay', 'Talusan', 'Titay', 'Tungawan'],
  
  // Region X (Northern Mindanao)
  'Bukidnon': ['Valencia', 'Malaybalay', 'Baungon', 'Cabanglasan', 'Damulog', 'Dangcagan', 'Don Carlos', 'Impasugong', 'Kadingilan', 'Kalilangan', 'Kibawe', 'Kitaotao', 'Lantapan', 'Libona', 'Malitbog', 'Manolo Fortich', 'Maramag', 'Pangantucan', 'Quezon', 'San Fernando', 'Sumilao', 'Talakag'],
  'Camiguin': ['Mambajao', 'Catarman', 'Guinsiliban', 'Mahinog', 'Sagay'],
  'Lanao del Norte': ['Iligan', 'Bacolod', 'Baloi', 'Baroy', 'Kapatagan', 'Kauswagan', 'Kolambugan', 'Lala', 'Linamon', 'Magsaysay', 'Maigo', 'Matungao', 'Munai', 'Nunungan', 'Pantao Ragat', 'Pantar', 'Poona Piagapo', 'Salvador', 'Sapad', 'Sultan Naga Dimaporo', 'Tagoloan', 'Tangcal', 'Tubod'],
  'Misamis Occidental': ['Oroquieta', 'Ozamiz', 'Tangub', 'Aloran', 'Baliangao', 'Bonifacio', 'Calamba', 'Clarin', 'Concepcion', 'Don Victoriano Chiongbian', 'Jimenez', 'Lopez Jaena', 'Panaon', 'Plaridel', 'Sapang Dalaga', 'Sinacaban', 'Tudela'],
  'Misamis Oriental': ['Cagayan de Oro', 'Gingoog', 'Alubijid', 'Balingasag', 'Balingoan', 'Binuangan', 'Claveria', 'El Salvador', 'Gitagum', 'Initao', 'Jasaan', 'Kinoguitan', 'Lagonglong', 'Laguindingan', 'Libertad', 'Lugait', 'Magsaysay', 'Manticao', 'Medina', 'Naawan', 'Opol', 'Salay', 'Sugbongcogon', 'Tagoloan', 'Talisayan', 'Villanueva'],
  
  // Region XI (Davao)
  'Davao de Oro': ['Nabunturan', 'Compostela', 'Laak', 'Mabini', 'Maco', 'Maragusan', 'Mawab', 'Monkayo', 'Montevista', 'New Bataan', 'Pantukan'],
  'Davao del Norte': ['Tagum', 'Panabo', 'Asuncion', 'Braulio E. Dujali', 'Carmen', 'Kapalong', 'New Corella', 'San Isidro', 'Santo Tomas', 'Samal', 'Talaingod'],
  'Davao del Sur': ['Davao City', 'Digos', 'Bansalan', 'Hagonoy', 'Kiblawan', 'Magsaysay', 'Malalag', 'Matanao', 'Padada', 'Santa Cruz', 'Sulop'],
  'Davao Occidental': ['Malita', 'Don Marcelino', 'Jose Abad Santos', 'Santa Maria', 'Sarangani'],
  'Davao Oriental': ['Mati', 'Baganga', 'Banaybanay', 'Boston', 'Caraga', 'Cateel', 'Governor Generoso', 'Lupon', 'Manay', 'San Isidro', 'Tarragona'],
  
  // Region XII (Soccsksargen)
  'Cotabato': ['Kidapawan', 'Alamada', 'Aleosan', 'Antipas', 'Arakan', 'Banisilan', 'Carmen', 'Kabacan', 'Libungan', 'M\'lang', 'Magpet', 'Makilala', 'Matalam', 'Midsayap', 'Pigcawayan', 'Pikit', 'President Roxas', 'Tulunan'],
  'Sarangani': ['Alabel', 'Glan', 'Kiamba', 'Maasim', 'Maitum', 'Malapatan', 'Malungon'],
  'South Cotabato': ['General Santos', 'Koronadal', 'Banga', 'Lake Sebu', 'Norala', 'Polomolok', 'Santo Niño', 'Surallah', 'T\'Boli', 'Tampakan', 'Tantangan', 'Tupi'],
  'Sultan Kudarat': ['Tacurong', 'Bagumbayan', 'Columbio', 'Esperanza', 'Isulan', 'Kalamansig', 'Lambayong', 'Lebak', 'Lutayan', 'Palimbang', 'President Quirino', 'Senator Ninoy Aquino'],
  
  // Region XIII (Caraga)
  'Agusan del Norte': ['Butuan', 'Cabadbaran', 'Buenavista', 'Carmen', 'Jabonga', 'Kitcharao', 'Las Nieves', 'Magallanes', 'Nasipit', 'Remedios T. Romualdez', 'Santiago', 'Tubay'],
  'Agusan del Sur': ['Bayugan', 'Bunawan', 'Esperanza', 'La Paz', 'Loreto', 'Prosperidad', 'Rosario', 'San Francisco', 'San Luis', 'Santa Josefa', 'Sibagat', 'Talacogon', 'Trento', 'Veruela'],
  'Dinagat Islands': ['San Jose', 'Basilisa', 'Cagdianao', 'Dinagat', 'Libjo', 'Loreto', 'Tubajon'],
  'Surigao del Norte': ['Surigao City', 'Alegria', 'Bacuag', 'Burgos', 'Claver', 'Dapa', 'Del Carmen', 'General Luna', 'Gigaquit', 'Mainit', 'Malimono', 'Pilar', 'Placer', 'San Benito', 'San Francisco', 'San Isidro', 'Santa Monica', 'Sison', 'Socorro', 'Tagana-an', 'Tubod'],
  'Surigao del Sur': ['Bislig', 'Tandag', 'Barobo', 'Bayabas', 'Cagwait', 'Cantilan', 'Carmen', 'Carrascal', 'Cortes', 'Hinatuan', 'Lanuza', 'Lianga', 'Lingig', 'Madrid', 'Marihatag', 'San Agustin', 'San Miguel', 'Tagbina', 'Tago'],
  
  // BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)
  'Basilan': ['Lamitan', 'Isabela City', 'Akbar', 'Al-Barka', 'Hadji Mohammad Ajul', 'Hadji Muhtamad', 'Lantawan', 'Maluso', 'Sumisip', 'Tabuan-Lasa', 'Tipo-Tipo', 'Tuburan', 'Ungkaya Pukan'],
  'Lanao del Sur': ['Marawi', 'Bacolod-Kalawi', 'Balabagan', 'Balindong', 'Bayang', 'Binidayan', 'Buadiposo-Buntong', 'Bubong', 'Butig', 'Calanogas', 'Ditsaan-Ramain', 'Ganassi', 'Kapai', 'Kapatagan', 'Lumba-Bayabao', 'Lumbaca-Unayan', 'Lumbatan', 'Lumbayanague', 'Madalum', 'Madamba', 'Maguing', 'Malabang', 'Marantao', 'Marogong', 'Masiu', 'Mulondo', 'Pagayawan', 'Piagapo', 'Picong', 'Poona Bayabao', 'Pualas', 'Saguiaran', 'Sultan Dumalondong', 'Tagoloan II', 'Tamparan', 'Taraka', 'Tubaran', 'Tugaya', 'Wao'],
  'Maguindanao': ['Cotabato City', 'Ampatuan', 'Barira', 'Buldon', 'Buluan', 'Datu Abdullah Sangki', 'Datu Anggal Midtimbang', 'Datu Blah T. Sinsuat', 'Datu Hoffer Ampatuan', 'Datu Montawal', 'Datu Odin Sinsuat', 'Datu Paglas', 'Datu Piang', 'Datu Salibo', 'Datu Saudi-Ampatuan', 'Datu Unsay', 'Gen. S. K. Pendatun', 'Guindulungan', 'Kabuntalan', 'Mamasapano', 'Mangudadatu', 'Matanog', 'Northern Kabuntalan', 'Pagalungan', 'Paglat', 'Pandag', 'Parang', 'Rajah Buayan', 'Shariff Aguak', 'Shariff Saydona Mustapha', 'South Upi', 'Sultan Kudarat', 'Sultan Mastura', 'Sultan sa Barongis', 'Talayan', 'Talitay', 'Upi'],
  'Sulu': ['Jolo', 'Banguingui', 'Hadji Panglima Tahil', 'Indanan', 'Kalingalan Caluang', 'Lugus', 'Luuk', 'Maimbung', 'Old Panamao', 'Omar', 'Pandami', 'Panglima Estino', 'Pangutaran', 'Parang', 'Pata', 'Patikul', 'Siasi', 'Talipao', 'Tapul'],
  'Tawi-Tawi': ['Bongao', 'Languyan', 'Mapun', 'Panglima Sugala', 'Sapa-Sapa', 'Sibutu', 'Simunul', 'Sitangkai', 'South Ubian', 'Tandubas', 'Turtle Islands'],
};

// Cities by US State
export const US_CITIES_BY_STATE: Record<string, string[]> = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Fresno', 'Oakland'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville'],
  'New York': ['New York', 'Buffalo', 'Rochester', 'Albany'],
  'Illinois': ['Chicago', 'Aurora', 'Naperville'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh'],
  'Arizona': ['Phoenix', 'Tucson'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati'],
  'North Carolina': ['Charlotte', 'Raleigh'],
  'Georgia': ['Atlanta'],
  'Michigan': ['Detroit'],
  'Washington': ['Seattle'],
  'Massachusetts': ['Boston'],
  'Tennessee': ['Nashville', 'Memphis'],
  'Colorado': ['Denver'],
  'Oregon': ['Portland'],
  'Nevada': ['Las Vegas'],
  'Louisiana': ['New Orleans'],
  'Kentucky': ['Louisville'],
  'Maryland': ['Baltimore'],
  'Wisconsin': ['Milwaukee'],
  'New Mexico': ['Albuquerque'],
  'Minnesota': ['Minneapolis'],
  'Kansas': ['Kansas City'],
  'Indiana': ['Indianapolis'],
};

// Cities by Canadian Province
export const CANADIAN_CITIES_BY_PROVINCE: Record<string, string[]> = {
  'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Kitchener', 'Oshawa', 'Windsor'],
  'Quebec': ['Montreal', 'Quebec City'],
  'British Columbia': ['Vancouver', 'Victoria'],
  'Alberta': ['Calgary', 'Edmonton'],
  'Manitoba': ['Winnipeg'],
  'Saskatchewan': ['Saskatoon', 'Regina'],
  'Nova Scotia': ['Halifax'],
};

// Cities by UK Region
export const UK_CITIES_BY_REGION: Record<string, string[]> = {
  'England': ['Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Sheffield', 'Newcastle', 'Brighton', 'Southampton', 'Cambridge', 'Oxford', 'Nottingham', 'Leicester'],
  'Greater London': ['London'],
  'Scotland': ['Glasgow', 'Edinburgh'],
  'Wales': ['Cardiff'],
  'Northern Ireland': ['Belfast'],
};

// Cities by Australian State
export const AUSTRALIAN_CITIES_BY_STATE: Record<string, string[]> = {
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria': ['Melbourne'],
  'Queensland': ['Brisbane', 'Gold Coast'],
  'Western Australia': ['Perth'],
  'South Australia': ['Adelaide'],
  'Tasmania': ['Hobart'],
  'Australian Capital Territory': ['Canberra'],
  'Northern Territory': ['Darwin'],
};

// Helper function to get provinces/states/regions based on country
export const getProvincesForCountry = (country: string): string[] => {
  switch (country) {
    case 'United States':
      return US_STATES;
    case 'Canada':
      return CANADIAN_PROVINCES;
    case 'United Kingdom':
      return UK_REGIONS;
    case 'Australia':
      return AUSTRALIAN_STATES;
    case 'Philippines':
      return PHILIPPINES_REGIONS;
    default:
      return [];
  }
};

// Helper function to get provinces by region (Philippines only)
export const getProvincesForRegion = (region: string): string[] => {
  return PHILIPPINES_PROVINCES_BY_REGION[region] || [];
};

// Helper function to get cities based on country and province/state
export const getCitiesForProvince = (country: string, province: string): string[] => {
  if (!province) return [];
  
  let citiesMap: Record<string, string[]> = {};
  
  switch (country) {
    case 'United States':
      citiesMap = US_CITIES_BY_STATE;
      break;
    case 'Canada':
      citiesMap = CANADIAN_CITIES_BY_PROVINCE;
      break;
    case 'United Kingdom':
      citiesMap = UK_CITIES_BY_REGION;
      break;
    case 'Australia':
      citiesMap = AUSTRALIAN_CITIES_BY_STATE;
      break;
    case 'Philippines':
      citiesMap = PHILIPPINES_CITIES_BY_PROVINCE;
      break;
    default:
      return [];
  }
  
  return citiesMap[province] || ['Other'];
};
