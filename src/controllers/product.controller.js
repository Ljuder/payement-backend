import prisma from "../config/prisma.js";

/**
 * Créer un produit
 * OWNER ne peut créer que dans ses shops
 */
export async function createProduct(req, res) {
  try {
    const { name, price, shopId, categoryId } = req.body;
    const user = req.user;

    // Validation
    if (!name || price == null || !shopId || !categoryId) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Vérifier que le shop existe
    const shop = await prisma.shop.findFirst({ 
        where:{ AND:[{ id: shopId, isDeleted:false }]},
        include: {owner: true}
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    // Vérifier que la categorie existe
    const category = await prisma.categories.findFirst({ 
        where: { AND:[{id: categoryId, isDeleted: false}] }
    });
    if (!category) {
      return res.status(404).json({ error: "Categorie introuvable" });
    }

    console.log(shop.owner.id, user.userId);
    // Vérifier rôle OWNER : ne peut créer que dans ses shops
    if (user.role == "OWNER" && shop.owner.id != user.userId) {
      return res.status(403).json({ error: "Pas le droit de créer dans ce shop" });
    }

    // Ne peux créer que dans les catégories du magasin sélectionné
    if (category.shopId !== shop.id) {
      return res.status(403).json({ error: "Pas le droit de créer dans cette categorie" });
    }

    const product = await prisma.product.create({
      data: { name, price, shopId, categoryId },
      omit: {isDeleted:true}
    });

    return res.status(201).json({ message: "Produit créé", product });
  } catch (error) {
    console.error("Erreur createProduct:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Lister les produits d'un shop et catégorie
 */
export async function getProductByShop(req, res) {
  try {
    //const shopId = parseInt(req.params.shopId);
    const { shopId, categoryId } = req.body;

    const shop = await prisma.shop.findFirst({ where: { AND: [{id: shopId, isDeleted:false}]}});
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    const products = await prisma.product.findMany({ 
        where: { AND:[{shopId, categoryId: categoryId, isDeleted:false}] },
        omit: {isDeleted: true}
    });
    return res.status(200).json(products);
  } catch (error) {
    console.error("Erreur getProductsByShop:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Modifier un produit
 * OWNER ne peut modifier que ses produits
 */
export async function updateProduct(req, res) {
  try {
    //const productId = parseInt(req.params.id);
    const { productId, name, price, categoryId } = req.body;
    const user = req.user;

    const product = await prisma.product.findFirst({
      where: { AND:[{id: productId, isDeleted:false}] },
      include: { shop: true },
    });

    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    // Vérifier que la categorie existe
    const category = await prisma.categories.findFirst({ where: { AND: [{id: categoryId != null ? categoryId: product.categoryId, isDeleted:false}]} });
    if (!category) {
      return res.status(404).json({ error: "Categorie introuvable" });
    } 

    // OWNER ne peut modifier que ses produits
    if (user.role === "OWNER" && product.shop.ownerId !== user.userId) {
      return res.status(403).json({ error: "Pas le droit de modifier ce produit" });
    }

    // Ne peux changer que vers une catégorie du même magasin
    if (category.shopId !== product.shop.id) {
      return res.status(403).json({ error: "Pas le droit de modifier dans cette categorie" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || product.name,
        price: price != null ? price : product.price,
        categoryId: categoryId != null ? categoryId : product.categoryId
      },
      omit: {isDeleted: true}
    });

    return res.status(200).json({ message: "Produit mis à jour", product: updatedProduct });
  } catch (error) {
    console.error("Erreur updateProduct:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Supprimer un produit
 * OWNER ne peut supprimer que ses produits
 */
export async function deleteProduct(req, res) {
  try {
    //const productId = parseInt(req.params.id);
    const user = req.user;
    const { productId } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    // OWNER ne peut supprimer que ses produits
    if (user.role === "OWNER" && product.shop.ownerId !== user.userId) {
      return res.status(403).json({ error: "Pas le droit de supprimer ce produit" });
    }

    await prisma.product.update({ 
        where: { id: productId },
        data: {isDeleted:true}
    });

    return res.status(200).json({ 
        message: "Produit supprimé",
        produit: product.name
    });
  } catch (error) {
    console.error("Erreur deleteProduct:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Acheter un produit
 * Débite le wallet et enregistre l'achat
 */
export async function buyProducts(req, res) {
  try {
    const userId = req.user.userId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items doit être un tableau non vide" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { AND:[{id: { in: productIds } , isDeleted: false}]}
    });

    if (products.length !== items.length) {
      return res.status(404).json({ error: "Un ou plusieurs produits sont introuvables" });
    }

    let totalPrice = 0;

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      totalPrice += product.price * item.quantity;
    }

    if (user.balance < totalPrice) {
      return res.status(402).json({
        error: "Solde insuffisant",
        balance: user.balance,
        required: totalPrice
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalPrice } },
      });

      const purchases = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);

        const purchase = await tx.purchase.create({
          data: {
            userId,
            productId: product.id,
            shopId: product.shopId, // 🟢 NOUVEAU : shop du produit
            amount: item.quantity,
            totalPrice: product.price * item.quantity,
          },
        });

        purchases.push(purchase);
      }

      return purchases;
    });

    return res.status(200).json({
      message: "Achat effectué avec succès",
      totalPaid: totalPrice,
      purchases: result
    });

  } catch (error) {
    console.error("Erreur buyProducts:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * permet à un TREASURER+ de faire acheter un produit à un utilisater
 * Débite le wallet et enregistre l'achat
 */
export async function manualBuyProducts(req, res) {
  try {
    const { identifiant, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items doit être un tableau non vide" });
    }

    const user = await prisma.user.findUnique({
      where: { identifiant: identifiant },
      select: { balance: true,
                id:true
       }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const userId = user.id;

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { AND: [{id: { in: productIds }, isDeleted:false}] }
    });

    if (products.length !== items.length) {
      return res.status(404).json({ error: "Un ou plusieurs produits sont introuvables" });
    }

    let totalPrice = 0;

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      totalPrice += product.price * item.quantity;
    }

    if (user.balance < totalPrice) {
      return res.status(402).json({
        error: "Solde insuffisant",
        balance: user.balance,
        required: totalPrice
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalPrice } },
      });

      const purchases = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);

        const purchase = await tx.purchase.create({
          data: {
            userId,
            productId: product.id,
            shopId: product.shopId, // NOUVEAU : shop du produit
            amount: item.quantity,
            totalPrice: product.price * item.quantity,
          },
        });

        purchases.push(purchase);
      }

      return purchases;
    });

    return res.status(200).json({
      message: "Achat effectué avec succès",
      totalPaid: totalPrice,
      purchases: result
    });

  } catch (error) {
    console.error("Erreur buyProducts:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}