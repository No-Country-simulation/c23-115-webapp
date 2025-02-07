import Actividad from "../models/Actividad.model.js";
import Inscripcion from "../models/inscripcion.model.js";
import Voluntario from "../models/voluntario.model.js";
import mongoose from "mongoose";
// Obtener todas las inscripciones
export const getAllInscripciones = async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find();
    res.status(200).json(inscripciones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener una inscripción por ID
export const getInscripcionById = async (req, res) => {
  try {
    const inscripcion = await Inscripcion.findById(req.params.id);
    if (!inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }
    res.status(200).json(inscripcion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear una nueva inscripción

export const createInscripcion = async (req, res) => {
  const { voluntario_id, actividad_id } = req.body;
  const session = await mongoose.startSession(); // Inicia la sesión para la transacción
  session.startTransaction(); // Inicia la transacción

  try {
    const voluntario = await Voluntario.findById(voluntario_id).session(session); // Usa la sesión
    if (!voluntario) {
      throw new Error("El voluntario no existe"); // Lanza un error para la transacción
    }

    const actividad = await Actividad.findById(actividad_id).session(session); // Usa la sesión
    if (!actividad) {
      throw new Error("La actividad no existe"); // Lanza un error para la transacción
    }

    if (!actividad.cupo_disponible) {
      throw new Error("No hay cupos disponibles para esta actividad"); // Lanza un error
    }

    const inscripcionesCount = await Inscripcion.countDocuments({ actividad_id }).session(session); // Usa la sesión

    if (inscripcionesCount >= actividad.cupo_maximo) {
      actividad.cupo_disponible = false;
      await actividad.save({ session }); // Guarda con la sesión
      throw new Error("No hay cupos disponibles para esta actividad"); // Lanza un error
    }

    const newInscripcion = new Inscripcion({
      voluntario_id,
      actividad_id,
      fecha_inscripcion: new Date(),
    });

    const savedInscripcion = await newInscripcion.save({ session }); // Guarda con la sesión

    // Actualizar el campo 'voluntarios_inscriptos' y 'cupo_disponible'
    actividad.voluntarios_inscriptos++;
    if (actividad.voluntarios_inscriptos >= actividad.cupo_maximo) {
      actividad.cupo_disponible = false;
    }
    await actividad.save({ session }); // Guarda con la sesión

    await session.commitTransaction(); // Confirma la transacción
    session.endSession(); // Finaliza la sesión

    res.status(201).json(savedInscripcion);

  } catch (error) {
    await session.abortTransaction(); // Cancela la transacción en caso de error
    session.endSession(); // Finaliza la sesión

    console.error("Error al crear inscripción:", error);
    res.status(500).json({ message: "Error al crear inscripción", error: error.message });
  }
};



// Actualizar una inscripción por id
export const updateInscripcion = async (req, res) => {
  try {
    const updatedInscripcion = await Inscripcion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ); // runValidators para validar las actualizaciones
    if (!updatedInscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }
    res.status(200).json(updatedInscripcion);
  } catch (error) {
    console.error("Error al actualizar inscripción:", error); // Log del error
    res.status(500).json({
      message: "Error al actualizar inscripción",
      error: error.message,
    }); // Respuesta con más detalle
  }
};

// Eliminar una inscripción por ID
export const deleteInscripcion = async (req, res) => {
  try {
    const deletedInscripcion = await Inscripcion.findByIdAndDelete(req.params.id);

    if (!deletedInscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    // Obtener la actividad para actualizar su cupo
    const actividad = await Actividad.findById(deletedInscripcion.actividad_id);
    if (actividad) {
      const inscriptosRestantes = await Inscripcion.countDocuments({ actividad_id: actividad._id });

      // Si hay cupos nuevamente, habilitar la inscripción
      if (inscriptosRestantes < actividad.cupo_maximo) {
        actividad.cupo_disponible = true;
        await actividad.save();
      }
    }

    res.status(200).json({ message: "Inscripción eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar inscripción:", error);
    res.status(500).json({ message: "Error al eliminar inscripción", error: error.message });
  }
};

