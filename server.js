const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const app = express();
const PORT = process.env.PORT || 5000;



mongoose.connect("mongodb+srv://rojin:1234@cluster0.q3ku82p.mongodb.net/product-management?retryWrites=true&w=majority&appName=Cluster0", {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});
const db = mongoose.connection;



const productSchema = new mongoose.Schema({
   name: String,
   price: Number,
   description: String,
});


const Product = mongoose.model("Product", productSchema);


const userSchema = new mongoose.Schema({
   email: {
       type: String,
       unique: true,
       required: true,
       trim: true,
   },
   password: {
       type: String,
       required: true,
       minlength: 8,
   },
});
const cartItemSchema = new mongoose.Schema({
   productId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Product",
       required: true,
   },
   quantity: {
       type: Number,
       required: true,
       min: 1,
   },
});



const cartSchema = new mongoose.Schema({
   userId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: true,
   },
   items: [cartItemSchema],
});


const Cart = mongoose.model("Cart", cartSchema);

userSchema.pre("save", async function (next) {
   const user = this;
   if (!user.isModified("password")) {
       return next();
   }
   try {
       const hashedPassword = await bcrypt.hash(user.password, 10);
       user.password = hashedPassword;
       next();
   } catch (error) {
       return next(error);
   }
});


const User = mongoose.model("User", userSchema);


app.use(bodyParser.json());



function authenticateToken(req, res, next) {
   const token = req.headers.authorization;


   if (!token) {
       return res
           .status(401)
           .json({ error: "Unauthorized: No token provided" });
   }


   jwt.verify(token, "secret_key", (err, decoded) => {
       if (err) {
           return res
               .status(403)
               .json({ error: "Unauthorized: Invalid token" });
       }


       req.userId = decoded.userId;
       next();
   });
}


app.get("/products", authenticateToken, async (req, res) => {
   try {
       
       const products = await Product.find({});
       res.json(products);
   } catch (error) {
       res.status(500).json({ error: "Failed to fetch products" });
   }
});


app.post("/register", async (req, res) => {
   const { email, password } = req.body;
   console.log(req.body);
   try {
       
       if (!email || !password) {
           return res
               .status(400)
               .json({ error: "Email and password are required" });
       }


       const existingUser = await User.findOne({ email });
       if (existingUser) {
           return res.status(400).json({ error: "Email already exists" });
       }


      
       const newUser = new User({ email, password });
       await newUser.save();


       res.json({ message: "User registered successfully" });
   } catch (error) {
       console.log(error);
       res.status(500).json({ error: "Registration failed" });
   }
});



app.post("/login", async (req, res) => {
   const { email, password } = req.body;


   try {
       
       const user = await User.findOne({ email });
       if (!user) {
           return res.status(401).json({ error: "Invalid email or password" });
       }


       
       const passwordMatch = await bcrypt.compare(password, user.password);
       if (!passwordMatch) {
           return res.status(401).json({ error: "Invalid email or password" });
       }


    
       const token = jwt.sign({ userId: user._id }, "secret_key", {
           expiresIn: "1h",
       });
       res.json({ token });
   } catch (error) {
       res.status(500).json({ error: "Login failed" });
   }
});


app.post("/cart/add", authenticateToken, async (req, res) => {
   try {
       const { productId, quantity } = req.body;


       
       if (!productId || !quantity || isNaN(quantity) || quantity <= 0) {
           return res
               .status(400)
               .json({ error: "Invalid product ID or quantity" });
       }


       
       const product = await Product.findById(productId);
       if (!product) {
           return res.status(404).json({ error: "Product not found" });
       }


       
       const userId = req.userId;


      
       let cart = await Cart.findOne({ userId });


       if (!cart) {
           cart = new Cart({ userId, items: [] });
       }


       
       const existingItem = cart.items.find((item) =>
           item.productId.equals(productId)
       );


       if (existingItem) {
           
           existingItem.quantity += quantity;
       } else {
           
           cart.items.push({ productId, quantity });
       }


      
       await cart.save();


       res.json({ message: "Product added to cart successfully" });
   } catch (error) {
       res.status(500).json({ error: "Failed to add product to cart" });
   }
});


app.post("/cart/remove", authenticateToken, async (req, res) => {
   try {
       const { productId } = req.body;


      
       if (!productId) {
           return res.status(400).json({ error: "Product ID is required" });
       }


       
       const userId = req.userId;


     
       const cart = await Cart.findOne({ userId });


       
       if (!cart) {
           return res.status(404).json({ error: "Cart not found" });
       }


      
       const indexToRemove = cart.items.findIndex((item) =>
           item.productId.equals(productId)
       );


       
       if (indexToRemove === -1) {
           return res.status(404).json({ error: "Product not found in cart" });
       }


       
       cart.items.splice(indexToRemove, 1);


       
       await cart.save();


       res.json({ message: "Product removed from cart successfully" });
   } catch (error) {
       res.status(500).json({ error: "Failed to remove product from cart" });
   }
});


app.post("/products/add", async (req, res) => {
   try {
       const { name, price, description } = req.body;


       
       if (!name || !price || !description) {
           return res
               .status(400)
               .json({ error: "Name, price, and description are required" });
       }


       
       const newProduct = new Product({ name, price, description });


      
       await newProduct.save();


       res.json({
           message: "Product added successfully",
           product: newProduct,
       });
   } catch (error) {
       res.status(500).json({ error: "Failed to add product" });
   }
});



function verifyToken(req, res, next) {
   const token = req.headers.authorization;


   if (!token) {
       return res
           .status(401)
           .json({ error: "Unauthorized: No token provided" });
   }


   jwt.verify(token, "secret_key", (err, decoded) => {
       if (err) {
           return res
               .status(403)
               .json({ error: "Unauthorized: Invalid token" });
       }


       req.userId = decoded.userId;
       next();
   });
}



app.get("/protected", verifyToken, (req, res) => {
   res.json({ message: "Protected route accessed successfully" });
});


app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
});
