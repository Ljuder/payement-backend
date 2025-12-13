import prisma from "../config/prisma.js";
import { createObjectCsvStringifier } from "csv-writer";

/**
 * Crée un nouveau shop
 * Accessible par TREASURER+ ou ADMIN
 */
export async function createShop(req, res) {
  try {
    const { name, ownerIdentifiant } = req.body;

    // 1️⃣ Validation
    if (!name || !ownerIdentifiant) {
      return res.status(400).json({ error: "Nom du shop et ownerId requis" });
    }

    // Verifier que le shop n'existe pas deja
    const existingShop = await prisma.shop.findFirst({
      where: { AND: [{name:name, isDeleted:false}]},
    });

    if (existingShop) {
      return res.status(400).json({ error: "Magasin déjà existant" });
    }    

    // 2️⃣ Vérifier que le propriétaire existe
    const owner = await prisma.user.findUnique({ 
        where: { identifiant: ownerIdentifiant },
        select:{ id: true}
    });
    if (!owner) {
      return res.status(404).json({ error: "Propriétaire introuvable" });
    }

    // 3️⃣ Créer le shop
    const shop = await prisma.shop.create({
      data: {
        name,
        ownerId:owner.id,
      },
      omit: {isDeleted: true}
    });

    return res.status(201).json({ message: "Shop créé", shop });
  } catch (error) {
    console.error("Erreur createShop:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Récupère tous les shops
 * Accessible à tous les utilisateurs connectés
 */
export async function getAllShops(req, res) {
  try {
    const shops = await prisma.shop.findMany({
      where: {isDeleted: false},
      include: {
        owner: { select: { id: true, identifiant: true, role: true } },
        isDeleted: false
      },
    });
    return res.status(200).json(shops);
  } catch (error) {
    console.error("Erreur getAllShops:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Met à jour un shop existant
 * Accessible par TREASURER+ ou ADMIN
 */
export async function updateShop(req, res) {
  try {
    //const shopId = parseInt(req.params.id);
    const { shopId, name, ownerIdentifiant } = req.body;

    // 1️⃣ Vérifier que le shop existe
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    // 2️⃣ Vérifier si nouveau propriétaire existe (si fourni)
    if (ownerIdentifiant) {
      const owner = await prisma.user.findUnique({ where: { identifiant: ownerIdentifiant || shop.ownerId} });
      if (!owner) {
        return res.status(404).json({ error: "Nouveau propriétaire introuvable" });
      }
      var ownerIdifExist = owner.id
    }
    const ownerId = ownerIdifExist

    // 3️⃣ Mise à jour
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: name || shop.name,
        ownerId: ownerId || shop.ownerId,
      },
      omit: {isDeleted: true}
    });

    return res.status(200).json({ 
        message: "Shop mis à jour", 
        shop: updatedShop,
        ownerIdentifiant: ownerIdentifiant 
    });
  } catch (error) {
    console.error("Erreur updateShop:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Supprime un shop
 * Accessible par TREASURER+ ou ADMIN
 */
export async function deleteShop(req, res) {
  try {
    //const shopId = parseInt(req.params.id);
    const { shopId, deleteAll } = req.body;

    // 1️⃣ Vérifier que le shop existe
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }
    const deletedShop = shop.name

    // 2️⃣ Supprimer le shop
    await prisma.shop.update({ 
        where: { id: shopId },
        data: {isDeleted: true}
    });

    if (deleteAll) {
        // Supprimer les produits du shop
        await prisma.product.update({ 
            where: { shopId: shopId },
            data: {isDeleted: true}
        });

        // Supprimer les catégories du shop
        await prisma.categories.update({ 
            where: { shopId: shopId },
            data: {isDeleted: true}
        });
    }

    return res.status(200).json({ 
        message: "Shop supprimé avec succès",
        magasinSupprimé: deletedShop
    });

  } catch (error) {
    console.error("Erreur deleteShop:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Export des opérations d'un shop depuis une date sous forme de csv
 */
export async function exportShopOperations(req, res) {
  try {
    const { shopId, fromDate } = req.body;
    //const { shopId } = req.params;
    //const fromDate = req.query.from;

    if (!shopId || !fromDate) {
      return res.status(400).json({ error: "shopId et from requis" });
    }

    const dateFrom = new Date(fromDate);
    if (isNaN(dateFrom.getTime())) {
      return res.status(400).json({ error: "Date invalide" });
    }

    const shop = await prisma.shop.findUnique({
      where: { id:shopId },
    });
    
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    // Récupérer toutes les opérations pour ce shop depuis la date donnée
    const purchases = await prisma.purchase.findMany({
      where: {
        shopId: Number(shopId),
        createdAt: { gte: dateFrom },
      },
      include: {
        user: { select: { identifiant: true, fams: true, proms: true } },
        product: { select: { name: true, price: true, isDeleted: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!purchases.length) {
      return res.status(404).json({ error: "Aucune opération trouvée" });
    }

    // Préparer CSV
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "date", title: "Date" },
        { id: "identifiant", title: "Utilisateur" },
        { id: "fams", title: "Fams" },
        { id: "proms", title: "Proms" },
        { id: "product", title: "Produit" },
        { id: "quantity", title: "Quantité" },
        { id: "totalPrice", title: "Montant" }
      ]
    });

    const records = purchases.map(p => ({
      date: p.createdAt.toISOString(),
      identifiant: p.user.identifiant,
      fams: p.user.fams,
      proms: p.user.proms,
      product: p.product.name,
      quantity: p.amount,
      totalPrice: p.totalPrice
    }));

    const csvHeader = csvStringifier.getHeaderString();
    const csvRecords = csvStringifier.stringifyRecords(records);

    // Envoi CSV
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=shop_${shopId}_operations.csv`);
    res.send(csvHeader + csvRecords);

  } catch (error) {
    console.error("Erreur exportShopOperations:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Gestion des catégories
 */

/**
 * Créer une categorie
 * OWNER ne peut créer que dans ses shops
 */
export async function createShopCategory(req, res) {
  try {
    const { name, shopId} = req.body;
    const user = req.user;

    // Validation
    if (!name || !shopId ) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Vérifier que le shop existe
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    // Verifier qu'il n'y a pas déjà de catégorie avec ce nom dans un même magasin
    const existingCategory = await prisma.categories.findFirst({
      where: {AND: [{catName:name, shopId:shopId, isDeleted: false}]}
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Il existe déjà une catégorie avec ce nom" });
    }    

    // Vérifier rôle OWNER : ne peut créer que dans ses shops
    if (user.role === "OWNER" && shop.ownerId !== user.userId) {
      return res.status(403).json({ error: "Pas le droit de créer dans ce shop" });
    }

    const category = await prisma.categories.create({
      data: { catName:name, shopId}, omit: {isDeleted:true}
    });

    return res.status(201).json({ message: "Catégorie créé", category });
  } catch (error) {
    console.error("Erreur createShopCategory:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Lister les catégories d'un shop
 */
export async function getAllShopCategories(req, res) {
  try {
    //const shopId = parseInt(req.params.shopId);
    const { shopId } = req.body;

    const shop = await prisma.shop.findUnique({ where: { id: shopId} });
    if (!shop) {
      return res.status(404).json({ error: "Shop introuvable" });
    }

    const categories = await prisma.categories.findMany({ where: { AND:[{shopId: shopId, isDeleted: false}]} });
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Erreur getAllShopCategories:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Modifier une categorie
 * OWNER ne peut modifier que les catégories de ses shop
 */
export async function updateShopCategory(req, res) {
  try {
    //const productId = parseInt(req.params.id);
    const { categoryId, name } = req.body;
    const user = req.user;

    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: { shop: true},
    });

    if (!category) return res.status(404).json({ error: "Catégorie introuvable" });

    // OWNER ne peut modifier que ses catégories
    if (user.role === "OWNER" && category.shop.ownerId !== user.userId) {
      return res.status(403).json({ error: "Pas le droit de modifier cette catégorie" });
    }

    // Verifier qu'il n'y a pas déjà de catégorie avec ce nom dans un même magasin
    const existingCategory = await prisma.categories.findFirst({
      where: {AND: [{catName:name, shopId: category.shop.id, isDeleted:false}]}
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Il existe déjà une catégorie avec ce nom" });
    }    



    const updatedCategory = await prisma.categories.update({
      where: { id: categoryId },
      data: {
        catName: name || category.catName,
      },
      omit: {isDeleted:true}
    });

    return res.status(200).json({ message: "Catégorie mise à jour", product: updatedCategory });
  } catch (error) {
    console.error("Erreur updateShopCategory:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Supprimer une categorie
 * OWNER ne peut supprimer que les catégories de ses shop
 */
export async function deleteShopCategory(req, res) {
  try {
    //const productId = parseInt(req.params.id);
    const user = req.user;
    const { categoryId, deleteAll} = req.body;

    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });

    if (!category) return res.status(404).json({ error: "Catégorie introuvable" });

    // OWNER ne peut supprimer que les catégories de ses shops
    if (user.role === "OWNER" && category.shop.ownerId !== user.userId) {
      return res.status(403).json({ error: "Pas le droit de supprimer cette catégorie" });
    }

    await prisma.categories.update({ 
        where: { id: categoryId },
        data: {isDeleted: true} 
    });

    // Suppression des produits d'une catégorie
    if(deleteAll){
        await prisma.product.update({ 
            where: { categoryId: categoryId },
            data:{ isDeleted: true} 
        });
    }

    return res.status(200).json({ 
        message: "Catégorie supprimée",
        categorie: category.catName
    });
  } catch (error) {
    console.error("Erreur deleteShopCategory:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}