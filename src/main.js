function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountDecimal = discount / 100;
    const fullPrice = sale_price * quantity;
    const revenue = fullPrice * (1 - discountDecimal);
    return revenue;
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (total === 0) return 0;
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0.00;
    } else {
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    if (!data
        || !data.purchase_records
        || !data.products
        || !data.sellers
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    const { purchase_records, products, sellers } = data;

    const sellerStats = sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));


    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));

    const productIndex = Object.fromEntries(products.map(product => [product.sku, product]));

    purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            const purchase = {
                discount: item.discount,
                sale_price: item.sale_price,
                quantity: item.quantity
            };
            const revenue = calculateRevenue(purchase, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    const total = sellerStats.length;
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, total, seller);
        seller.top_products =
            Object.entries(seller.products_sold)
                .map(([sku, quantity]) => ({ sku, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10)
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}
