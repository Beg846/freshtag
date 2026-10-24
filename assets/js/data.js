/* FreshTag — dữ liệu demo.
   Toàn bộ sản phẩm, trang trại, chứng nhận và chỉ số dưới đây là hư cấu. */
(function () {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;

  function at(offsetDays, hours, minutes) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  function date(offsetDays) {
    return at(offsetDays, 12, 0).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  function dayShort(offsetDays) {
    return at(offsetDays, 12, 0).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit'
    });
  }

  function stamp(offsetDays, hours, minutes) {
    return dayShort(offsetDays) + ' · ' + String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  function audioDate(offsetDays) {
    return at(offsetDays, 12, 0).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  const STATUS = {
    safe: {
      key: 'safe',
      label: 'An toàn',
      tagName: 'Xanh lá',
      tagText: 'TƯƠI',
      tagSub: 'An toàn',
      verdict: 'TƯƠI NGON · AN TOÀN',
      icon: 'shield',
      headline: 'Tươi ngon, an toàn',
      short: 'Tem xanh — dùng ngay',
      advice: 'Bảo quản 0–4°C và chế biến trong thời gian khuyến nghị.'
    },
    warning: {
      key: 'warning',
      label: 'Cần chú ý',
      tagName: 'Cam',
      tagText: 'NẤU NGAY',
      tagSub: 'Cần nấu kỹ',
      verdict: 'NÊN NẤU NGAY',
      icon: 'alert',
      headline: 'Vẫn dùng được, cần nấu chín kỹ',
      short: 'Tem cam — nấu ngay',
      advice: 'Nấu chín hoàn toàn trong hôm nay. Không ăn tái, không ăn sống.'
    },
    danger: {
      key: 'danger',
      label: 'Không an toàn',
      tagName: 'Tím thẫm',
      tagText: 'KHÔNG ĂN',
      tagSub: 'Vượt ngưỡng',
      verdict: 'KHÔNG NÊN SỬ DỤNG',
      icon: 'x-circle',
      headline: 'Không an toàn để sử dụng',
      short: 'Tem tím — bỏ lại',
      advice: 'Không chế biến hay tiêu thụ. Liên hệ nơi mua và cơ quan an toàn thực phẩm nếu cần.'
    }
  };

  const LOTS = {
    'FT-BEEF-8892': {
      code: 'FT-BEEF-8892',
      product: 'Thịt bò thăn lưng',
      cutName: 'Ribeye',
      subtitle: 'Phần thịt mềm nhất, vân mỡ đẹp',
      emoji: '🥩',
      animal: 'cow',
      status: 'safe',
      freshnessPercent: 15,
      tvbn: 8.4,
      ph: 5.6,
      temp: 2.4,
      dateLong: date(3),
      packed: 'Hôm nay · 06:30',
      packedDate: date(0),
      bestBefore: date(3),
      useWithin: '3 ngày tới',
      storage: '0–4°C',
      statusTitle: 'Thịt đạt chuẩn tươi ngon',
      statusDesc: 'Tem cảm biến đang ở vùng xanh. Chỉ số TVB-N thấp, nhiệt độ chuỗi lạnh ổn định. Có thể chế biến ngay.',
      handling: 'Bảo quản ngăn mát 0–4°C, dùng trong 3 ngày. Không rửa thịt trước khi cất; nếu chưa dùng hết, chia nhỏ và cấp đông.',
      farm: {
        name: 'Trang trại Bò sạch Ba Vì',
        owner: 'HTX Chăn nuôi Tốt Động',
        address: 'Tốt Động, Ba Vì, Hà Nội',
        emoji: '🐄',
        since: '2016',
        area: '4,2 ha',
        breed: 'Bò lai Brahman',
        age: '28 tháng',
        story: 'Đàn bò được nuôi thả trên đồng cỏ ven chân núi Ba Vì, ăn cỏ tự nhiên và bắp ủ lên men. Trang trại không dùng hormone tăng trưởng, có hệ thống theo dõi từng cá thể.',
        certs: ['VietGAP', 'ISO 22000', 'Kiểm dịch thú y'],
        mapQuery: 'Tốt Động, Ba Vì, Hà Nội'
      },
      inspector: 'Chi cục Chăn nuôi & Thú y Hà Nội',
      certNo: 'VG-8892-2026/BO',
      inspectedAt: date(-2),
      certValidUntil: date(68),
      market: 'FreshMart Nguyễn Trãi',
      chainFacts: [
        { icon: 'thermometer', label: 'Chuỗi lạnh', value: '2,4°C' },
        { icon: 'clock', label: 'Từ đóng gói', value: '2 giờ' },
        { icon: 'shield', label: 'Kiểm định', value: 'Đạt' }
      ],
      journey: [
        { icon: 'tractor', title: 'Xuất chuồng tại trang trại', time: stamp(-2, 4, 30), desc: 'Bò thẻ tai 04-8892, 28 tháng tuổi, đạt kiểm dịch trước giết mổ.', verified: true },
        { icon: 'building', title: 'Giết mổ & kiểm dịch', time: stamp(-2, 5, 40), desc: 'Cơ sở giết mổ đạt chuẩn tại Ba Vì. Niêm phong thú y được ghi nhận.', verified: true },
        { icon: 'flask', title: 'Kiểm nghiệm mẫu lô', time: stamp(-2, 10, 15), desc: 'Âm tính Salmonella và E. coli. TVB-N 8,4 mg/100g — trong ngưỡng tươi.', verified: true },
        { icon: 'package', title: 'Đóng gói & dán tem', time: stamp(0, 6, 30), desc: 'Tem FreshTag được kích hoạt, bảo quản trong phòng lạnh 3°C.', verified: true },
        { icon: 'truck', title: 'Vận chuyển lạnh', time: stamp(0, 7, 10), desc: 'Xe lạnh ghi nhận 2,4°C trong suốt hành trình.', verified: true },
        { icon: 'store', title: 'Đến cửa hàng', time: stamp(0, 8, 20), desc: 'Nhập quầy mát FreshMart Nguyễn Trãi, Hà Nội.', verified: true }
      ],
      cut: {
        name: 'Thăn lưng · Ribeye',
        location: 'Dọc sống lưng, phần cơ ít vận động',
        description: 'Thăn lưng nằm dọc sống lưng, ít vận động nên thịt mềm, có vân mỡ xen kẽ. Phù hợp áp chảo, nướng hoặc xào nhanh ở lửa lớn.',
        tags: ['Mềm', 'Vân mỡ đẹp', 'Hợp áp chảo']
      },
      recipes: [
        {
          id: 'bo-luc-lac',
          title: 'Bò lúc lắc mềm thơm',
          emoji: '🍳',
          time: '25 phút',
          difficulty: 'Dễ',
          servings: '2 người',
          tags: ['Nhanh gọn', 'Bữa tối'],
          ingredients: ['300 g thăn lưng bò', '1/2 củ hành tây', '1/2 quả ớt chuông', '2 tép tỏi', '1 thìa dầu hàu', '10 g bơ lạt'],
          steps: [
            'Thái bò thành khối vuông khoảng 2 cm. Ướp với tỏi băm, dầu hàu và tiêu trong 10 phút.',
            'Làm nóng chảo thật nóng, cho bơ vào rồi xào bò ở lửa lớn trong 2 phút.',
            'Thêm hành tây và ớt chuông, đảo nhanh khoảng 1 phút để rau còn giòn.',
            'Nêm nếm, tắt bếp và rắc tiêu. Dùng nóng với cơm hoặc khoai tây nghiền.'
          ],
          tip: 'Xào lửa lớn và đừng đảo quá lâu — thịt sẽ mềm và không ra nước.'
        },
        {
          id: 'bo-bit-tet',
          title: 'Bít tết sốt tiêu đen',
          emoji: '🥩',
          time: '20 phút',
          difficulty: 'Trung bình',
          servings: '2 người',
          tags: ['Bữa tối', 'Đãi khách'],
          ingredients: ['2 miếng thăn lưng 200 g', '20 g bơ lạt', '2 tép tỏi', '1 thìa tiêu đen rang', '50 ml kem tươi', '1 thìa nước tương'],
          steps: [
            'Đưa thịt về nhiệt độ phòng 15 phút, thấm khô và nêm muối, tiêu.',
            'Áp chảo lửa lớn mỗi mặt 2–3 phút, thêm bơ và tỏi ở phút cuối. Lấy thịt ra nghỉ 5 phút.',
            'Dùng lại chảo, rang tiêu, thêm kem tươi và nước tương, khuấy đến khi sốt sánh.',
            'Cắt thịt miếng dày, rưới sốt tiêu đen và dùng nóng.'
          ],
          tip: 'Dùng nhiệt kế thực phẩm: tâm thịt 54°C cho miếng vừa, 63°C cho miếng chín vừa.'
        },
        {
          id: 'bo-xao-hanh-tay',
          title: 'Bò xào hành tây',
          emoji: '🥢',
          time: '15 phút',
          difficulty: 'Dễ',
          servings: '2 người',
          tags: ['Nhanh gọn', 'Cơm nhà'],
          ingredients: ['250 g thăn bò thái lát', '1 củ hành tây', '1 quả cà chua', '1 thìa nước mắm', '1 thìa dầu ăn', 'Hành lá, tiêu'],
          steps: [
            'Ướp thịt với nước mắm, tiêu và một ít dầu ăn trong 10 phút.',
            'Phi thơm hành, cho thịt vào xào nhanh ở lửa lớn đến khi vừa chín.',
            'Thêm hành tây và cà chua, đảo 1–2 phút rồi nêm lại.',
            'Rắc hành lá, dùng nóng với cơm trắng.'
          ],
          tip: 'Thái thịt ngược thớ để miếng thịt mềm hơn khi xào nhanh.'
        }
      ]
    },

    'FT-PORK-4102': {
      code: 'FT-PORK-4102',
      product: 'Thịt heo ba chỉ',
      cutName: 'Pork belly',
      subtitle: 'Nạc mỡ xen kẽ, hợp món kho',
      emoji: '🥓',
      animal: 'pig',
      status: 'warning',
      freshnessPercent: 54,
      tvbn: 18.7,
      ph: 6.0,
      temp: 4.8,
      dateLong: date(0),
      packed: 'Hôm qua · 16:20',
      packedDate: date(-1),
      bestBefore: date(0),
      useWithin: 'Trong hôm nay',
      storage: '0–4°C',
      statusTitle: 'Tem chuyển cam — hãy nấu ngay',
      statusDesc: 'Độ tươi đã giảm nhẹ nhưng thịt vẫn có thể sử dụng nếu nấu chín kỹ ngay hôm nay. Không ăn tái hoặc ăn sống.',
      handling: 'Nấu chín hoàn toàn (tâm thịt ≥ 72°C) và dùng trong hôm nay. Không tái đông. Nếu thấy mùi lạ, nhớt hoặc màu bất thường, hãy bỏ.',
      farm: {
        name: 'Trang trại Heo sinh học Mộc Châu',
        owner: 'HTX Mộc Châu Xanh',
        address: 'Thị trấn Mộc Châu, Sơn La',
        emoji: '🐖',
        since: '2019',
        area: '2,8 ha',
        breed: 'Heo Yorkshire × Landrace',
        age: '7 tháng',
        story: 'Heo được nuôi trong chuồng hở, sử dụng thức ăn ủ men vi sinh và nước giếng khoan đạt chuẩn. Quy trình chuồng trại được ghi nhật ký hằng ngày.',
        certs: ['VietGAP', 'VietGAHP'],
        mapQuery: 'Mộc Châu, Sơn La'
      },
      inspector: 'Chi cục Thú y Sơn La',
      certNo: 'VG-4102-2026/HEO',
      inspectedAt: date(-1),
      certValidUntil: date(67),
      market: 'FreshMart Nguyễn Trãi',
      chainFacts: [
        { icon: 'thermometer', label: 'Chuỗi lạnh', value: '4,8°C' },
        { icon: 'clock', label: 'Từ đóng gói', value: '18 giờ' },
        { icon: 'shield', label: 'Kiểm định', value: 'Đạt' }
      ],
      journey: [
        { icon: 'tractor', title: 'Xuất chuồng tại trang trại', time: stamp(-1, 8, 0), desc: 'Heo thẻ tai 4102, 7 tháng tuổi, khỏe mạnh trước vận chuyển.', verified: true },
        { icon: 'building', title: 'Giết mổ & kiểm dịch', time: stamp(-1, 14, 0), desc: 'Giết mổ tại cơ sở đạt chuẩn, có tem kiểm dịch thú y.', verified: true },
        { icon: 'flask', title: 'Kiểm nghiệm mẫu lô', time: stamp(-1, 15, 0), desc: 'TVB-N 18,7 mg/100g — vẫn trong ngưỡng sử dụng nhưng cần nấu chín kỹ.', verified: true },
        { icon: 'package', title: 'Đóng gói & dán tem', time: stamp(-1, 16, 20), desc: 'Tem FreshTag bắt đầu đổi màu nhẹ về cuối ngày.', verified: true },
        { icon: 'truck', title: 'Vận chuyển lạnh', time: stamp(0, 5, 30), desc: 'Nhiệt độ ghi nhận 4,8°C — cao hơn khuyến nghị một chút.', verified: true },
        { icon: 'store', title: 'Đến cửa hàng', time: stamp(0, 6, 15), desc: 'Nhập quầy mát FreshMart Nguyễn Trãi, Hà Nội.', verified: true }
      ],
      cut: {
        name: 'Ba chỉ · Pork belly',
        location: 'Phần bụng, xen kẽ nạc và mỡ',
        description: 'Ba chỉ là phần bụng của heo, có các lớp nạc mỡ xen kẽ. Vị béo ngậy, thích hợp kho, luộc, rang hoặc nướng. Nên nấu chín kỹ vì đây là phần thịt nhiều mỡ.',
        tags: ['Béo ngậy', 'Hợp kho', 'Nấu chín kỹ']
      },
      recipes: [
        {
          id: 'ba-chi-kho-tau',
          title: 'Ba chỉ kho tàu chuẩn vị',
          emoji: '🍲',
          time: '50 phút',
          difficulty: 'Dễ',
          servings: '3 người',
          tags: ['Cơm nhà', 'Cuối tuần'],
          ingredients: ['400 g ba chỉ heo', '6 quả trứng cút', '200 ml nước dừa tươi', '2 củ hành tím', '1 thìa nước mắm', '1 thìa đường thốt nốt', 'Tiêu, hành lá'],
          steps: [
            'Thái ba chỉ miếng vuông 3 cm, chần qua nước sôi rồi rửa sạch, thấm khô.',
            'Thắng đường thốt nốt đến màu cánh gián, cho thịt vào đảo săn đều.',
            'Thêm hành tím, nước mắm, nước dừa tươi và nước lọc ngập thịt. Kho lửa nhỏ 30 phút.',
            'Cho trứng cút vào kho thêm 10 phút đến khi nước sốt sánh. Rắc tiêu và hành lá.'
          ],
          tip: 'Kho lửa nhỏ để thịt chín mềm. Bảo đảm thịt đạt ít nhất 72°C ở tâm trước khi dùng.'
        },
        {
          id: 'ba-chi-luoc',
          title: 'Ba chỉ luộc chấm mắm tôm',
          emoji: '🥬',
          time: '25 phút',
          difficulty: 'Dễ',
          servings: '3 người',
          tags: ['Nhanh gọn', 'Cơm nhà'],
          ingredients: ['300 g ba chỉ heo', '1 củ hành khô', '1 nhánh gừng', '2 thìa mắm tôm', '1 quả chanh', 'Ớt, tỏi, đường'],
          steps: [
            'Đun nước với hành khô và gừng đập dập, cho thịt vào luộc đến khi chín hẳn (≥ 72°C).',
            'Vớt thịt, để nguội bớt rồi thái miếng mỏng vừa ăn.',
            'Pha mắm tôm với nước cốt chanh, đường, tỏi và ớt; đánh bông đến khi nổi bọt.',
            'Bày thịt với rau sống, dưa leo và chấm cùng mắm tôm.'
          ],
          tip: 'Không dùng thịt còn hồng bên trong. Thời gian luộc tùy độ dày miếng thịt.'
        },
        {
          id: 'ba-chi-nuong-sa',
          title: 'Ba chỉ nướng sả',
          emoji: '🍢',
          time: '35 phút',
          difficulty: 'Trung bình',
          servings: '3 người',
          tags: ['Cuối tuần', 'Đãi khách'],
          ingredients: ['400 g ba chỉ heo', '3 cây sả', '2 tép tỏi', '1 thìa nước mắm', '1 thìa mật ong', '1/2 thìa ngũ vị hương', 'Mè rang'],
          steps: [
            'Băm nhuyễn sả và tỏi, trộn với nước mắm, mật ong, ngũ vị hương.',
            'Thái ba chỉ miếng dày 0,5 cm, ướp ít nhất 20 phút trong tủ lạnh.',
            'Nướng trên bếp than hoặc nồi chiên không dầu ở 190°C trong 15 phút, trở mặt giữa chừng.',
            'Nướng đến khi mặt thịt vàng và chín hoàn toàn, rắc mè rang.'
          ],
          tip: 'Vì lô này đang ở mức cam, hãy nướng chín kỹ hơn bình thường và dùng ngay trong hôm nay.'
        }
      ]
    },

    'FT-BEEF-0012': {
      code: 'FT-BEEF-0012',
      product: 'Thịt bò thăn lưng',
      cutName: 'Ribeye · Cảnh báo',
      subtitle: 'Lô đã quá hạn, tem tím thẫm',
      emoji: '🥩',
      animal: 'cow',
      status: 'danger',
      freshnessPercent: 92,
      tvbn: 32.5,
      ph: 6.7,
      temp: 9.5,
      dateLong: date(-2),
      packed: '6 ngày trước · 08:15',
      packedDate: date(-6),
      bestBefore: date(-2),
      useWithin: 'Đã quá hạn 2 ngày',
      storage: 'Ngoài ngưỡng an toàn',
      statusTitle: 'Tem đã chuyển tím thẫm',
      statusDesc: 'Chỉ số biến chất vượt ngưỡng an toàn, nhiệt độ bảo quản không ổn định. Tuyệt đối không chế biến hoặc tiêu thụ lô thịt này.',
      handling: 'Giữ nguyên bao bì và tem, không mở. Liên hệ cửa hàng để trả hàng. Nếu đã ăn và có triệu chứng bất thường, gọi ngay 115 hoặc đến cơ sở y tế gần nhất.',
      farm: {
        name: 'Không xác định được nguồn gốc',
        owner: 'Dữ liệu truy xuất không đầy đủ',
        address: 'Không có thông tin',
        emoji: '❓',
        since: '—',
        area: '—',
        breed: 'Không rõ',
        age: '—',
        story: 'Mã lô này không khớp với dữ liệu trang trại đã đăng ký. Tem có dấu hiệu bong tróc và thông tin kiểm định không thể xác thực. Đây là lô hàng cần được báo cáo.',
        certs: [],
        mapQuery: ''
      },
      inspector: 'Không có dữ liệu kiểm định',
      certNo: '',
      inspectedAt: '—',
      certValidUntil: '—',
      market: 'Không xác định',
      chainFacts: [
        { icon: 'thermometer', label: 'Chuỗi lạnh', value: '9,5°C' },
        { icon: 'clock', label: 'Từ đóng gói', value: '6 ngày' },
        { icon: 'shield', label: 'Kiểm định', value: 'Không xác thực' }
      ],
      journey: [
        { icon: 'tractor', title: 'Nguồn gốc trang trại', time: 'Không có dữ liệu', desc: 'Mã lô không khớp với cơ sở đã đăng ký. Không thể xác định nơi sản xuất.', verified: false },
        { icon: 'building', title: 'Giết mổ & kiểm dịch', time: 'Không có dữ liệu', desc: 'Không có chứng từ kiểm dịch được liên kết với lô hàng.', verified: false },
        { icon: 'flask', title: 'Kiểm nghiệm mẫu lô', time: 'Không có dữ liệu', desc: 'Không tìm thấy kết quả kiểm nghiệm. TVB-N 32,5 mg/100g vượt ngưỡng an toàn.', verified: false },
        { icon: 'package', title: 'Đóng gói & dán tem', time: stamp(-6, 8, 15), desc: 'Tem FreshTag ghi nhận đã kích hoạt, nhưng thông tin lô không đầy đủ.', verified: false },
        { icon: 'truck', title: 'Vận chuyển lạnh', time: stamp(-6, 9, 0), desc: 'Không có dữ liệu nhiệt độ chuỗi lạnh. Nhiệt độ đọc được khi quét: 9,5°C.', verified: false },
        { icon: 'store', title: 'Điểm bán', time: 'Không xác định', desc: 'Điểm bán không được ghi nhận trong hệ thống truy xuất.', verified: false }
      ],
      cut: {
        name: 'Thăn lưng · Ribeye',
        location: 'Dọc sống lưng, phần cơ ít vận động',
        description: 'Vị trí danh nghĩa là thăn lưng, nhưng lô hàng đã vượt ngưỡng an toàn. Không khuyến nghị sử dụng phần thịt này dưới bất kỳ hình thức nào.',
        tags: ['Không an toàn', 'Không sử dụng']
      },
      recipes: [],
      safetySteps: [
        'Không nếm thử để kiểm tra. Mùi và vị không phải căn cứ an toàn.',
        'Giữ nguyên bao bì, tem và hoá đơn; chụp lại mã lô để phản ánh.',
        'Liên hệ cửa hàng nơi mua để yêu cầu đổi/trả và báo cáo lô hàng.',
        'Nếu đã ăn phải, theo dõi triệu chứng và gọi 115 khi cần.'
      ]
    },

    'FT-CHICKEN-2231': {
      code: 'FT-CHICKEN-2231',
      product: 'Ức gà ta',
      cutName: 'Chicken breast',
      subtitle: 'Nạc, giàu đạm, ít mỡ',
      emoji: '🍗',
      animal: 'chicken',
      status: 'safe',
      freshnessPercent: 10,
      tvbn: 6.2,
      ph: 5.8,
      temp: 1.8,
      dateLong: date(2),
      packed: 'Hôm nay · 06:45',
      packedDate: date(0),
      bestBefore: date(2),
      useWithin: '2 ngày tới',
      storage: '0–4°C',
      statusTitle: 'Thịt gà tươi, đạt chuẩn',
      statusDesc: 'Tem xanh, nhiệt độ bảo quản thấp và chỉ số TVB-N rất tốt. Phù hợp cho các món áp chảo, hấp hoặc salad.',
      handling: 'Bảo quản 0–4°C, dùng trong 2 ngày. Luôn nấu chín hoàn toàn và rửa tay sau khi tiếp xúc với thịt sống.',
      farm: {
        name: 'Trang trại Gà thả vườn Đông Anh',
        owner: 'HTX Nông nghiệp Đông Anh',
        address: 'Đông Anh, Hà Nội',
        emoji: '🐓',
        since: '2020',
        area: '1,6 ha',
        breed: 'Gà ta lai Ri',
        age: '110 ngày',
        story: 'Gà được nuôi thả vườn, ăn ngô, thóc và rau xanh. Chuồng trại có lưới chắn và nhật ký tiêm phòng đầy đủ. Quy trình được kiểm tra định kỳ mỗi tháng.',
        certs: ['VietGAP', 'HACCP', 'Kiểm dịch thú y'],
        mapQuery: 'Đông Anh, Hà Nội'
      },
      inspector: 'Chi cục Chăn nuôi & Thú y Hà Nội',
      certNo: 'VG-2231-2026/GA',
      inspectedAt: date(0),
      certValidUntil: date(68),
      market: 'FreshMart Nguyễn Trãi',
      chainFacts: [
        { icon: 'thermometer', label: 'Chuỗi lạnh', value: '1,8°C' },
        { icon: 'clock', label: 'Từ đóng gói', value: '1 giờ' },
        { icon: 'shield', label: 'Kiểm định', value: 'Đạt' }
      ],
      journey: [
        { icon: 'tractor', title: 'Xuất chuồng tại trang trại', time: stamp(0, 3, 30), desc: 'Gà khỏe mạnh, có nhật ký tiêm phòng và kiểm dịch trước giết mổ.', verified: true },
        { icon: 'building', title: 'Giết mổ & kiểm dịch', time: stamp(0, 5, 0), desc: 'Giết mổ tại cơ sở đạt HACCP, kiểm dịch viên có mặt trực tiếp.', verified: true },
        { icon: 'flask', title: 'Kiểm nghiệm mẫu lô', time: stamp(0, 6, 0), desc: 'TVB-N 6,2 mg/100g; âm tính với Salmonella. Đạt chỉ tiêu an toàn.', verified: true },
        { icon: 'package', title: 'Đóng gói & dán tem', time: stamp(0, 6, 45), desc: 'Đóng gói hút chân không, dán tem FreshTag, bảo quản 2°C.', verified: true },
        { icon: 'truck', title: 'Vận chuyển lạnh', time: stamp(0, 7, 30), desc: 'Xe lạnh ghi nhận 1,8°C trong suốt 35 phút vận chuyển.', verified: true },
        { icon: 'store', title: 'Đến cửa hàng', time: stamp(0, 8, 5), desc: 'Nhập quầy mát FreshMart Nguyễn Trãi, Hà Nội.', verified: true }
      ],
      cut: {
        name: 'Ức gà · Chicken breast',
        location: 'Phần ngực, nạc và ít mỡ',
        description: 'Ức gà là phần ngực, giàu đạm và ít mỡ. Thích hợp áp chảo, hấp, nướng hoặc xé sợi cho salad. Nên mang thịt về nhiệt độ phòng trước khi nấu để chín đều.',
        tags: ['Giàu đạm', 'Ít mỡ', 'Dễ chế biến']
      },
      recipes: [
        {
          id: 'ga-ap-chao-mat-ong',
          title: 'Gà áp chảo mật ong',
          emoji: '🍯',
          time: '20 phút',
          difficulty: 'Dễ',
          servings: '2 người',
          tags: ['Nhanh gọn', 'Ít dầu mỡ'],
          ingredients: ['2 miếng ức gà', '1 thìa mật ong', '1 thìa nước tương', '1 tép tỏi', '1/2 thìa dầu ăn', 'Tiêu, mè rang'],
          steps: [
            'Đập ức gà hơi dẹt, ướp với mật ong, nước tương, tỏi băm và tiêu trong 10 phút.',
            'Làm nóng chảo với chút dầu, áp chảo mỗi mặt 4–5 phút ở lửa vừa.',
            'Kiểm tra tâm thịt đạt 73°C, quét phần sốt còn lại lên mặt gà.',
            'Nghỉ thịt 3 phút, cắt lát và rắc mè rang. Dùng với rau củ hoặc cơm.'
          ],
          tip: 'Ức gà dễ khô. Không áp chảo quá lâu và luôn để thịt nghỉ trước khi cắt.'
        },
        {
          id: 'ga-hap-la-chanh',
          title: 'Gà hấp lá chanh',
          emoji: '🍃',
          time: '30 phút',
          difficulty: 'Dễ',
          servings: '3 người',
          tags: ['Cơm nhà', 'Thanh đạm'],
          ingredients: ['500 g ức gà', '1 nắm lá chanh', '2 củ hành khô', '1 nhánh gừng', '1 thìa nước mắm', 'Muối, tiêu'],
          steps: [
            'Chà ức gà với muối và gừng, rửa sạch rồi thấm khô.',
            'Ướp gà với nước mắm, tiêu và lá chanh thái nhỏ trong 10 phút.',
            'Xếp gà vào xửng cùng hành khô và gừng, hấp 20–25 phút đến khi chín hẳn.',
            'Để nguội 5 phút, xé hoặc thái miếng. Dùng với cơm và rau luộc.'
          ],
          tip: 'Hấp giữ được vị ngọt tự nhiên. Kiểm tra nước trong xửng không chạm vào thịt.'
        },
        {
          id: 'salad-uc-ga',
          title: 'Salad ức gà rau củ',
          emoji: '🥗',
          time: '15 phút',
          difficulty: 'Dễ',
          servings: '2 người',
          tags: ['Nhanh gọn', 'Ít dầu mỡ'],
          ingredients: ['1 miếng ức gà', 'Xà lách, cà chua bi', '1/2 quả dưa leo', '1 thìa dầu ô liu', '1/2 quả chanh', 'Muối, tiêu'],
          steps: [
            'Luộc hoặc áp chảo ức gà đến khi chín hoàn toàn, thái miếng vừa ăn.',
            'Rửa sạch rau củ, cắt nhỏ và để thật ráo.',
            'Pha dầu ô liu, nước cốt chanh, muối và tiêu thành sốt.',
            'Trộn gà với rau củ, rưới sốt và dùng ngay.'
          ],
          tip: 'Để rau thật ráo nước để salad không bị nhũn. Dùng gà nguội sẽ ngon hơn.'
        }
      ]
    }
  };

  const ALIASES = {
    'FT-BEEF-8892': 'FT-BEEF-8892',
    'BEEF': 'FT-BEEF-8892',
    'FRESHTAGDEMOBEEF': 'FT-BEEF-8892',
    'FT-PORK-4102': 'FT-PORK-4102',
    'PORK': 'FT-PORK-4102',
    'FRESHTAGDEMOPORK': 'FT-PORK-4102',
    'FT-BEEF-0012': 'FT-BEEF-0012',
    'SPOILED': 'FT-BEEF-0012',
    'FRESHTAGDEMOSPOILED': 'FT-BEEF-0012',
    'FT-CHICKEN-2231': 'FT-CHICKEN-2231',
    'CHICKEN': 'FT-CHICKEN-2231',
    'GA': 'FT-CHICKEN-2231'
  };

  const SAMPLE_ORDER = ['FT-BEEF-8892', 'FT-PORK-4102', 'FT-BEEF-0012', 'FT-CHICKEN-2231'];

  window.FRESHTAG_DATA = {
    STATUS,
    LOTS,
    ALIASES,
    SAMPLE_ORDER,
    date,
    stamp,
    audioDate
  };
})();
